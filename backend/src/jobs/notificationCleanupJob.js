import cron from 'node-cron';
import { config } from '../config/env.js';
import { cleanupOldNotifications, cleanupOrphanedTokens, getNotificationStats } from '../utils/notificationCleanup.js';

/**
 * Schedule notification cleanup job
 * Runs based on CLEANUP_CRON_SCHEDULE environment variable (default: daily at 2:00 AM)
 */
export const scheduleNotificationCleanup = () => {
  // Run cleanup based on cron schedule from config
  cron.schedule(config.notifications.cleanupCronSchedule, async () => {
    console.log('🕐 Starting scheduled notification cleanup...');
    
    try {
      // Get stats before cleanup
      const statsBefore = await getNotificationStats();
      console.log('📊 Stats before cleanup:', statsBefore);
      
      // Run cleanup
      const cleanupResult = await cleanupOldNotifications();
      await cleanupOrphanedTokens();
      
      // Get stats after cleanup
      const statsAfter = await getNotificationStats();
      console.log('📊 Stats after cleanup:', statsAfter);
      
      console.log('✅ Scheduled notification cleanup completed successfully');
      
    } catch (error) {
      console.error('❌ Scheduled notification cleanup failed:', error);
    }
  });
  
  console.log(`⏰ Notification cleanup job scheduled (${config.notifications.cleanupCronSchedule})`);
};

/**
 * Manual cleanup function for testing
 */
export const runManualCleanup = async () => {
  console.log('🧹 Running manual notification cleanup...');
  
  try {
    const statsBefore = await getNotificationStats();
    console.log('📊 Stats before cleanup:', statsBefore);
    
    const cleanupResult = await cleanupOldNotifications();
    await cleanupOrphanedTokens();
    
    const statsAfter = await getNotificationStats();
    console.log('📊 Stats after cleanup:', statsAfter);
    
    return {
      success: true,
      statsBefore,
      statsAfter,
      cleanupResult
    };
    
  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    throw error;
  }
};