import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';
import { notifyAccountDeactivated, notifyAccountActivated } from '../../services/notificationService.js';

export const createUser = async (userData, creatorRole, creatorId) => {
  const { name, email, phone, password, role } = userData;

  // Security check: super_admin can only create admin and super_admin
  if (creatorRole === 'super_admin' && !['admin', 'super_admin'].includes(role)) {
    throw new ApiError(403, 'Super Admin can only create Admin and Super Admin users');
  }

  // Security check: admin can create customer, project_manager, site_incharge, finance
  if (creatorRole === 'admin' && !['customer', 'project_manager', 'site_incharge', 'finance'].includes(role)) {
    throw new ApiError(403, 'Admin can only create Customer, Project Manager, Site Incharge, and Finance users');
  }

  const db = getDB();

  // Check if email already exists
  const [existingUsers] = await db.execute(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existingUsers.length > 0) {
    throw new ApiError(400, 'Email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const userId = uuidv4();
  await db.execute(
    `INSERT INTO users (id, name, email, phone, password, role, is_active, created_at,
                        date_of_joining, date_of_birth, current_address, permanent_address, city) 
     VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW(), ?, ?, ?, ?, ?)`,
    [userId, name, email, phone, hashedPassword, role,
     userData.date_of_joining || null,
     userData.date_of_birth || null,
     userData.current_address || null,
     userData.permanent_address || null,
     userData.city || null]
  );

  // Log action
  await logAudit('CREATE_USER', creatorId, userId, `Created user ${email} with role ${role}`);

  // Fetch created user without password
  const [users] = await db.execute(
    `SELECT id, name, email, phone, role, is_active, created_at, 
            date_of_joining, date_of_birth, current_address, permanent_address, city 
     FROM users WHERE id = ?`,
    [userId]
  );

  return users[0];
};

export const getAllUsers = async (roleFilter = null) => {
  const db = getDB();

  const whereClause = roleFilter ? 'WHERE u.role = ?' : '';
  const params = roleFilter ? [roleFilter] : [];

  const [users] = await db.execute(
    `SELECT 
      u.id, 
      u.name, 
      u.email, 
      u.phone, 
      u.role, 
      u.is_active, 
      u.created_at,
      u.date_of_joining,
      u.date_of_birth,
      u.current_address,
      u.permanent_address,
      u.city,
      COUNT(CASE WHEN p.status NOT IN ('CLOSED') AND p.pm_id = u.id THEN 1 END) as active_projects_as_pm,
      COUNT(CASE WHEN p.status NOT IN ('CLOSED') AND p.site_id = u.id THEN 1 END) as active_projects_as_site,
      COUNT(CASE WHEN p.status NOT IN ('CLOSED') AND p.finance_id = u.id THEN 1 END) as active_projects_as_finance
    FROM users u
    LEFT JOIN projects p ON (p.pm_id = u.id OR p.site_id = u.id OR p.finance_id = u.id)
    ${whereClause}
    GROUP BY u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at, 
             u.date_of_joining, u.date_of_birth, u.current_address, u.permanent_address, u.city
    ORDER BY u.created_at DESC`,
    params
  );

  // Calculate total active projects for each user
  const usersWithCounts = users.map(user => ({
    ...user,
    active_projects: (user.active_projects_as_pm || 0) + 
                    (user.active_projects_as_site || 0) + 
                    (user.active_projects_as_finance || 0)
  }));

  return usersWithCounts;
};

export const getUserById = async (userId, requestorRole, requestorId) => {
  const db = getDB();

  // Fetch user
  const [users] = await db.execute(
    `SELECT 
      u.id, 
      u.name, 
      u.email, 
      u.phone, 
      u.role, 
      u.is_active, 
      u.created_at,
      u.date_of_joining,
      u.date_of_birth,
      u.current_address,
      u.permanent_address,
      u.city,
      COUNT(CASE WHEN p.status NOT IN ('CLOSED') AND p.pm_id = u.id THEN 1 END) as active_projects_as_pm,
      COUNT(CASE WHEN p.status NOT IN ('CLOSED') AND p.site_id = u.id THEN 1 END) as active_projects_as_site,
      COUNT(CASE WHEN p.status NOT IN ('CLOSED') AND p.finance_id = u.id THEN 1 END) as active_projects_as_finance
    FROM users u
    LEFT JOIN projects p ON (p.pm_id = u.id OR p.site_id = u.id OR p.finance_id = u.id)
    WHERE u.id = ?
    GROUP BY u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
             u.date_of_joining, u.date_of_birth, u.current_address, u.permanent_address, u.city`,
    [userId]
  );

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const user = users[0];

  // Role-based access control
  if (requestorRole === 'super_admin' || requestorRole === 'admin') {
    // Can view all users
  } else if (requestorRole === 'project_manager' || requestorRole === 'site_incharge' || requestorRole === 'finance') {
    // Can view their own profile and other users (limited info)
  } else if (requestorRole === 'customer') {
    // Can only view their own profile
    if (userId !== requestorId) {
      throw new ApiError(403, 'You can only view your own profile');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view user details');
  }

  // Calculate total active projects
  const userWithCounts = {
    ...user,
    active_projects: (user.active_projects_as_pm || 0) + 
                    (user.active_projects_as_site || 0) + 
                    (user.active_projects_as_finance || 0)
  };

  return userWithCounts;
};

export const updateUserDetails = async (userId, details, updaterRole, updaterId) => {
  const db = getDB();

  const [users] = await db.execute('SELECT id, role, email FROM users WHERE id = ?', [userId]);
  if (users.length === 0) throw new ApiError(404, 'User not found');
  const targetUser = users[0];

  // Permission: admin can edit non-admin/non-super_admin users only
  if (updaterRole === 'admin' && ['admin', 'super_admin'].includes(targetUser.role)) {
    throw new ApiError(403, 'Admin cannot edit Admin or Super Admin users');
  }
  // Permission: super_admin can edit anyone except other super_admins (unless self)
  if (updaterRole === 'super_admin' && targetUser.role === 'super_admin' && userId !== updaterId) {
    throw new ApiError(403, 'Cannot edit another Super Admin');
  }

  const { name, phone, email, date_of_joining, date_of_birth, current_address, permanent_address, city } = details;

  // If email is being changed, check uniqueness
  if (email && email !== targetUser.email) {
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existing.length > 0) throw new ApiError(400, 'Email already in use');
  }

  await db.execute(
    `UPDATE users SET 
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      date_of_joining = ?, date_of_birth = ?,
      current_address = ?, permanent_address = ?, city = ?
     WHERE id = ?`,
    [
      name?.trim() || null, phone?.trim() || null, email?.trim() || null,
      date_of_joining || null, date_of_birth || null,
      current_address || null, permanent_address || null, city || null,
      userId
    ]
  );

  await logAudit('UPDATE_USER_DETAILS', updaterId, userId, `Updated profile details for user ${userId}`);

  const [updatedUsers] = await db.execute(
    `SELECT id, name, email, phone, role, is_active, created_at,
            date_of_joining, date_of_birth, current_address, permanent_address, city
     FROM users WHERE id = ?`,
    [userId]
  );
  return updatedUsers[0];
};

export const updateUserRole = async (userId, newRole, updaterRole, updaterId) => {
  const db = getDB();

  // Fetch target user
  const [users] = await db.execute(
    'SELECT id, email, role, is_active FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const targetUser = users[0];

  // Security check: cannot modify super_admin (except by super_admin)
  if (targetUser.role === 'super_admin' && updaterRole !== 'super_admin') {
    throw new ApiError(403, 'Cannot modify super_admin user');
  }

  // Security check: cannot downgrade super_admin
  if (targetUser.role === 'super_admin' && newRole !== 'super_admin') {
    throw new ApiError(403, 'Cannot downgrade super_admin role');
  }

  // Security check: admin cannot assign super_admin role
  if (updaterRole === 'admin' && newRole === 'super_admin') {
    throw new ApiError(403, 'Admin cannot assign super_admin role');
  }

  // Security check: cannot modify your own role to super_admin
  if (userId === updaterId && newRole === 'super_admin' && targetUser.role !== 'super_admin') {
    throw new ApiError(403, 'Cannot modify your own role to super_admin');
  }

  // Update role
  await db.execute(
    'UPDATE users SET role = ? WHERE id = ?',
    [newRole, userId]
  );

  // Log action
  await logAudit('CHANGE_ROLE', updaterId, userId, `Changed role from ${targetUser.role} to ${newRole}`);

  // Fetch updated user
  const [updatedUsers] = await db.execute(
    `SELECT id, name, email, phone, role, is_active, created_at, 
            date_of_joining, date_of_birth, current_address, permanent_address, city 
     FROM users WHERE id = ?`,
    [userId]
  );

  return updatedUsers[0];
};

export const deactivateUser = async (userId, reason, deactivatorRole, deactivatorId) => {
  const db = getDB();

  // Fetch target user
  const [users] = await db.execute(
    'SELECT id, email, role, is_active FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const targetUser = users[0];

  // Security check: super_admin users cannot be deactivated by anyone (including themselves)
  if (targetUser.role === 'super_admin') {
    throw new ApiError(403, 'Super Admin users cannot be deactivated');
  }

  // Security check: only super_admin can deactivate admin users
  if (targetUser.role === 'admin' && deactivatorRole !== 'super_admin') {
    throw new ApiError(403, 'Only Super Admin can deactivate Admin users');
  }

  // Security check: admin can deactivate customer, project_manager, site_incharge, finance
  if (deactivatorRole === 'admin' && !['customer', 'project_manager', 'site_incharge', 'finance'].includes(targetUser.role)) {
    throw new ApiError(403, 'Admin can only deactivate Customer, Project Manager, Site Incharge, and Finance users');
  }

  // Security check: cannot deactivate yourself
  if (userId === deactivatorId) {
    throw new ApiError(403, 'You cannot deactivate yourself');
  }

  // Check if already deactivated
  if (!targetUser.is_active) {
    throw new ApiError(400, 'User is already deactivated');
  }

  // Deactivate user: set is_active to false
  await db.execute(
    'UPDATE users SET is_active = FALSE WHERE id = ?',
    [userId]
  );

  // Log action
  const description = reason 
    ? `Deactivated user ${targetUser.email}. Reason: ${reason}`
    : `Deactivated user ${targetUser.email}`;
  
  await logAudit('DEACTIVATE_USER', deactivatorId, userId, description);

  // Send notification to the deactivated user
  try {
    await notifyAccountDeactivated(userId, targetUser.email);
  } catch (notificationError) {
    console.error('Error sending deactivation notification:', notificationError);
    // Don't fail the deactivation if notification fails
  }

  // Fetch updated user
  const [updatedUsers] = await db.execute(
    `SELECT id, name, email, phone, role, is_active, created_at, 
            date_of_joining, date_of_birth, current_address, permanent_address, city 
     FROM users WHERE id = ?`,
    [userId]
  );

  return updatedUsers[0];
};

export const activateUser = async (userId, activatorRole, activatorId) => {
  const db = getDB();

  // Fetch target user
  const [users] = await db.execute(
    'SELECT id, email, role, is_active FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const targetUser = users[0];

  // Security check: only super_admin can activate admin users
  if (targetUser.role === 'admin' && activatorRole !== 'super_admin') {
    throw new ApiError(403, 'Only Super Admin can activate Admin users');
  }

  // Security check: admin can activate customer, project_manager, site_incharge, finance
  if (activatorRole === 'admin' && !['customer', 'project_manager', 'site_incharge', 'finance'].includes(targetUser.role)) {
    throw new ApiError(403, 'Admin can only activate Customer, Project Manager, Site Incharge, and Finance users');
  }

  // Check if already active
  if (targetUser.is_active) {
    throw new ApiError(400, 'User is already active');
  }

  // Activate user: set is_active to true
  await db.execute(
    'UPDATE users SET is_active = TRUE WHERE id = ?',
    [userId]
  );

  // Log action
  await logAudit('ACTIVATE_USER', activatorId, userId, `Activated user ${targetUser.email}`);

  // Send notification to the activated user
  try {
    await notifyAccountActivated(userId, targetUser.email);
  } catch (notificationError) {
    console.error('Error sending activation notification:', notificationError);
    // Don't fail the activation if notification fails
  }

  // Fetch updated user
  const [updatedUsers] = await db.execute(
    `SELECT id, name, email, phone, role, is_active, created_at, 
            date_of_joining, date_of_birth, current_address, permanent_address, city 
     FROM users WHERE id = ?`,
    [userId]
  );

  return updatedUsers[0];
};

export const getSessionStatus = async (userId) => {
  const db = getDB();
  const now = new Date();
  const [sessions] = await db.execute(
    'SELECT id, created_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > ? LIMIT 1',
    [userId, now]
  );
  return { hasActiveSession: sessions.length > 0, session: sessions[0] || null };
};

export const forceLogoutUser = async (userId, requestorRole, requestorId) => {
  const db = getDB();

  const [users] = await db.execute('SELECT id, email, role FROM users WHERE id = ?', [userId]);
  if (users.length === 0) throw new ApiError(404, 'User not found');
  const targetUser = users[0];

  // Same permission rules as deactivate
  if (targetUser.role === 'super_admin' && requestorRole !== 'super_admin') {
    throw new ApiError(403, 'Cannot force logout a Super Admin');
  }
  if (targetUser.role === 'admin' && requestorRole !== 'super_admin') {
    throw new ApiError(403, 'Only Super Admin can force logout Admin users');
  }

  const [result] = await db.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
  await logAudit('FORCE_LOGOUT', requestorId, userId, `Force logged out user ${targetUser.email} from all devices`);

  return { deletedSessions: result.affectedRows };
};
