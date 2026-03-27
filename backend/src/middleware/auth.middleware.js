import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getDB } from '../config/db.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const db = getDB();

    // Validate session exists and is not expired
    const tokenHash = hashToken(token);
    const [sessions] = await db.execute(
      'SELECT id FROM sessions WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    );

    if (sessions.length === 0) {
      throw new ApiError(401, 'Session expired or logged out from another device. Please login again.');
    }

    const [users] = await db.execute(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      throw new ApiError(401, 'User not found');
    }

    const user = users[0];

    if (!user.is_active) {
      throw new ApiError(401, 'User account is inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired');
    }
    throw error;
  }
});
