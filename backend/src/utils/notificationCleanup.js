import { getDB } from '../config/db.js';
import { config } from '../config/env.js';

/**
 * Clean up old notifications to prevent database bloat
 * Recommended to run this daily via cron job
 */
export const cleanupOldNotifications = async () => {
  const db = getDB();
  
  try {
    // Delete notifications older than configured retention days
    const [result] = await db.execute(
      `DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ${config.notifications.retentionDays} DAY)`
    );
    
    console.log(`🧹 Cleaned up ${result.affectedRows} old notifications (>${config.notifications.retentionDays} days)`);
    
    // Optional: Delete read notifications older than configured read retention days
    const [readResult] = await db.execute(
      `DELETE FROM notifications WHERE read_status = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL ${config.notifications.readRetentionDays} DAY)`
    );
    
    console.log(`🧹 Cleaned up ${readResult.affectedRows} old read notifications (>${config.notifications.readRetentionDays} days)`);
    
    return {
      totalDeleted: result.affectedRows,
      readDeleted: readResult.affectedRows
    };
    
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
    throw error;
  }
};

/**
 * Clean up orphaned push tokens (users that no longer exist)
 */
export const cleanupOrphanedTokens = async () => {
  const db = getDB();
  
  try {
    const [result] = await db.execute(`
      DELETE pt FROM push_tokens pt 
      LEFT JOIN users u ON pt.user_id = u.id 
      WHERE u.id IS NULL
    `);
    
    console.log(`🧹 Cleaned up ${result.affectedRows} orphaned push tokens`);
    return result.affectedRows;
    
  } catch (error) {
    console.error('❌ Error cleaning up orphaned tokens:', error);
    throw error;
  }
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async () => {
  const db = getDB();
  
  try {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN read_status = TRUE THEN 1 END) as read_notifications,
        COUNT(CASE WHEN read_status = FALSE THEN 1 END) as unread_notifications,
        COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as last_7_days,
        COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as last_30_days
      FROM notifications
    `);
    
    const [tokenStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_tokens,
        COUNT(CASE WHEN device_type = 'ios' THEN 1 END) as ios_tokens,
        COUNT(CASE WHEN device_type = 'android' THEN 1 END) as android_tokens
      FROM push_tokens
    `);
    
    return {
      notifications: stats[0],
      tokens: tokenStats[0]
    };
    
  } catch (error) {
    console.error('❌ Error getting notification stats:', error);
    throw error;
  }
};