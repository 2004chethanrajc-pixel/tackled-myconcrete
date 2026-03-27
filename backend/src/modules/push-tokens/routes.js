import express from 'express';
import * as pushTokenController from './controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Register/update push token
router.post('/register', pushTokenController.registerPushToken);

// Unregister push token
router.post('/unregister', pushTokenController.unregisterPushToken);

// Get user notifications
router.get('/notifications', pushTokenController.getNotifications);

// Mark notification as read
router.patch('/notifications/:notificationId/read', pushTokenController.markNotificationRead);

// Mark all notifications as read
router.patch('/notifications/read-all', pushTokenController.markAllNotificationsRead);

export default router;
