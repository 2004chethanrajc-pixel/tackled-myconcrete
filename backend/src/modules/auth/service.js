import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { config } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';
import { sendOTPEmail, sendPasswordResetConfirmation, sendOTPSMS } from '../../utils/emailService.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const loginUser = async (identifier, password, forceLogout = false) => {
  const db = getDB();

  // Check if identifier is email or phone
  const isEmail = identifier.includes('@');
  
  // Find user by email or phone
  const query = isEmail 
    ? `SELECT id, name, email, phone, password, role, is_active, created_at, 
              date_of_joining, date_of_birth, current_address, permanent_address, city 
       FROM users WHERE email = ?`
    : `SELECT id, name, email, phone, password, role, is_active, created_at, 
              date_of_joining, date_of_birth, current_address, permanent_address, city 
       FROM users WHERE phone = ?`;
    
  const [users] = await db.execute(query, [identifier]);

  if (users.length === 0) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const user = users[0];

  // Check if user is active
  if (!user.is_active) {
    throw new ApiError(401, 'Account is inactive. Please contact administrator');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check for existing active session
  const now = new Date();
  const [activeSessions] = await db.execute(
    'SELECT id FROM sessions WHERE user_id = ? AND expires_at > ?',
    [user.id, now]
  );

  if (activeSessions.length > 0 && !forceLogout) {
    // Return 409 so the client can prompt the user
    throw new ApiError(409, 'Active session exists on another device. Please logout from all devices first.');
  }

  // Clear all existing sessions for this user (force logout or normal flow after no active session)
  await db.execute('DELETE FROM sessions WHERE user_id = ?', [user.id]);

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  // Store session
  const sessionId = uuidv4();
  const tokenHash = hashToken(token);
  // Parse expiry from config (e.g. "7d", "24h") — default 7 days
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await db.execute(
    'INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, NOW(), ?)',
    [sessionId, user.id, tokenHash, expiresAt]
  );

  // Log login action
  await logAudit('USER_LOGIN', user.id, user.id, `User ${user.email || user.phone} logged in`);

  // Remove password from response
  delete user.password;

  return { user, token };
};

export const logoutUser = async (token) => {
  const db = getDB();
  const tokenHash = hashToken(token);
  await db.execute('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
};

export const getUserProfile = async (userId) => {
  const db = getDB();

  const [users] = await db.execute(
    `SELECT id, name, email, phone, role, is_active, created_at,
            date_of_joining, date_of_birth, current_address, permanent_address, city
     FROM users WHERE id = ?`,
    [userId]
  );

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  return users[0];
};

export const registerCustomer = async (userData) => {
  const { name, email, phone, password } = userData;
  const db = getDB();

  // Check if email already exists
  const [existingEmailUsers] = await db.execute(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existingEmailUsers.length > 0) {
    throw new ApiError(400, 'Email already exists');
  }

  // Check if phone already exists
  const [existingPhoneUsers] = await db.execute(
    'SELECT id FROM users WHERE phone = ?',
    [phone]
  );

  if (existingPhoneUsers.length > 0) {
    throw new ApiError(400, 'Phone number already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create customer user
  const userId = uuidv4();
  await db.execute(
    `INSERT INTO users (id, name, email, phone, password, role, is_active, created_at) 
     VALUES (?, ?, ?, ?, ?, 'customer', TRUE, NOW())`,
    [userId, name, email, phone, hashedPassword]
  );

  // Log action
  await logAudit('CUSTOMER_SIGNUP', userId, userId, `Customer ${email} signed up`);

  // Fetch created user without password
  const [users] = await db.execute(
    `SELECT id, name, email, phone, role, is_active, created_at, 
            date_of_joining, date_of_birth, current_address, permanent_address, city 
     FROM users WHERE id = ?`,
    [userId]
  );

  return users[0];
};

export const requestPasswordReset = async (identifier) => {
  const db = getDB();

  // Check if identifier is email or phone
  const isEmail = identifier.includes('@');
  
  // Find user by email or phone
  const query = isEmail 
    ? 'SELECT id, name, email, phone, is_active FROM users WHERE email = ?'
    : 'SELECT id, name, email, phone, is_active FROM users WHERE phone = ?';
    
  const [users] = await db.execute(query, [identifier]);

  if (users.length === 0) {
    throw new ApiError(404, `No account found with this ${isEmail ? 'email' : 'phone number'}`);
  }

  const user = users[0];

  // Check if user is active
  if (!user.is_active) {
    throw new ApiError(400, 'Account is inactive. Please contact administrator');
  }

  // Generate configurable-digit OTP
  const otp = Math.floor(Math.pow(10, config.otp.length - 1) + Math.random() * (Math.pow(10, config.otp.length) - Math.pow(10, config.otp.length - 1))).toString();

  // Set expiration time (configurable minutes from now)
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  // Delete any existing unused OTPs for this user
  await db.execute(
    'DELETE FROM password_reset_otps WHERE user_id = ? AND used = FALSE',
    [user.id]
  );

  // Store OTP in database
  const otpId = uuidv4();
  await db.execute(
    `INSERT INTO password_reset_otps (id, user_id, otp, expires_at, used, created_at) 
     VALUES (?, ?, ?, ?, FALSE, NOW())`,
    [otpId, user.id, otp, expiresAt]
  );

  // Send OTP via email or SMS
  try {
    if (isEmail) {
      await sendOTPEmail(user.email, otp, user.name);
    } else {
      await sendOTPSMS(user.phone, otp);
    }
} catch (error) {
  // 🔍 Log detailed error in console (backend only)
  console.error("❌ Fast2SMS Error:", {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status
  });

  // 🧹 Delete OTP if SMS failed
  await db.execute(
    'DELETE FROM password_reset_otps WHERE id = ?',
    [otpId]
  );

  // 🚫 Send only generic message to frontend
  throw new ApiError(500, "Failed to send OTP. Please try again later.");
}

  // Log action
  await logAudit('PASSWORD_RESET_REQUEST', user.id, user.id, `Password reset OTP sent to ${identifier}`);

  return {
    success: true,
    message: `OTP sent to your ${isEmail ? 'email' : 'phone'}`,
    identifier: identifier,
    isEmail: isEmail
  };
};

export const verifyOTP = async (identifier, otp) => {
  const db = getDB();

  // Validate OTP format
  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    throw new ApiError(400, 'Invalid OTP format. OTP must be 6 digits');
  }

  // Check if identifier is email or phone
  const isEmail = identifier.includes('@');
  
  // Find user by email or phone
  const query = isEmail 
    ? 'SELECT id, name, email, phone FROM users WHERE email = ?'
    : 'SELECT id, name, email, phone FROM users WHERE phone = ?';
    
  const [users] = await db.execute(query, [identifier]);

  if (users.length === 0) {
    throw new ApiError(404, `No account found with this ${isEmail ? 'email' : 'phone number'}`);
  }

  const user = users[0];

  // Find valid OTP
  const [otps] = await db.execute(
    `SELECT id, otp, expires_at, used FROM password_reset_otps 
     WHERE user_id = ? AND otp = ? AND used = FALSE 
     ORDER BY created_at DESC LIMIT 1`,
    [user.id, otp]
  );

  if (otps.length === 0) {
    throw new ApiError(400, 'Invalid OTP code. Please check and try again');
  }

  const otpRecord = otps[0];

  // Check if OTP has expired
  if (new Date() > new Date(otpRecord.expires_at)) {
    throw new ApiError(400, 'OTP has expired. Please request a new one');
  }

  // Log action
  await logAudit('OTP_VERIFIED', user.id, user.id, `OTP verified for ${identifier}`);

  return {
    valid: true,
    userId: user.id,
    otpId: otpRecord.id,
    message: 'OTP verified successfully'
  };
};

export const resetPassword = async (identifier, otp, newPassword) => {
  const db = getDB();

  // Validate password
  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  // Verify OTP first
  const verification = await verifyOTP(identifier, otp);

  // Get user details
  const [users] = await db.execute(
    'SELECT id, name, email, phone FROM users WHERE id = ?',
    [verification.userId]
  );

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const user = users[0];

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  await db.execute(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, verification.userId]
  );

  // Mark OTP as used
  await db.execute(
    'UPDATE password_reset_otps SET used = TRUE WHERE id = ?',
    [verification.otpId]
  );

  // Send confirmation email (don't throw error if this fails)
  if (user.email) {
    try {
      await sendPasswordResetConfirmation(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }
  }

  // Log action
  await logAudit('PASSWORD_RESET', verification.userId, verification.userId, `Password reset completed for ${identifier}`);

  return { 
    success: true,
    message: 'Password reset successful. You can now login with your new password.'
  };
};
