import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export const registerPushToken = async (userId, pushToken, deviceType) => {
  const db = getDB();
  
  // Check if token already exists
  const [existing] = await db.execute(
    'SELECT id FROM push_tokens WHERE push_token = ?',
    [pushToken]
  );
  
  if (existing.length > 0) {
    // Update existing token
    await db.execute(
      'UPDATE push_tokens SET user_id = ?, device_type = ?, updated_at = NOW() WHERE push_token = ?',
      [userId, deviceType, pushToken]
    );
    return { id: existing[0].id, updated: true };
  }
  
  // Insert new token
  const id = uuidv4();
  await db.execute(
    'INSERT INTO push_tokens (id, user_id, push_token, device_type) VALUES (?, ?, ?, ?)',
    [id, userId, pushToken, deviceType]
  );
  
  return { id, created: true };
};

export const unregisterPushToken = async (userId, pushToken) => {
  const db = getDB();
  
  await db.execute(
    'DELETE FROM push_tokens WHERE user_id = ? AND push_token = ?',
    [userId, pushToken]
  );
};

export const getNotifications = async (userId, limit = 50, offset = 0) => {
  const db = getDB();
  
  const [notifications] = await db.execute(
    `SELECT id, title, body, data, read_status, created_at 
     FROM notifications 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  
  return notifications;
};

export const markNotificationRead = async (notificationId, userId) => {
  const db = getDB();
  
  const [result] = await db.execute(
    'UPDATE notifications SET read_status = TRUE WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  
  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Notification not found');
  }
};

export const markAllNotificationsRead = async (userId) => {
  const db = getDB();
  
  await db.execute(
    'UPDATE notifications SET read_status = TRUE WHERE user_id = ? AND read_status = FALSE',
    [userId]
  );
};
