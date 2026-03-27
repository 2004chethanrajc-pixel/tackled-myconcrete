import * as pushTokenService from './service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const registerPushToken = asyncHandler(async (req, res) => {
  const { pushToken, deviceType } = req.body;
  const userId = req.user.id;
  
  const result = await pushTokenService.registerPushToken(userId, pushToken, deviceType);
  
  res.status(200).json({
    success: true,
    message: 'Push token registered successfully',
    data: result,
  });
});

export const unregisterPushToken = asyncHandler(async (req, res) => {
  const { pushToken } = req.body;
  const userId = req.user.id;
  
  await pushTokenService.unregisterPushToken(userId, pushToken);
  
  res.status(200).json({
    success: true,
    message: 'Push token unregistered successfully',
  });
});

export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0 } = req.query;
  
  const notifications = await pushTokenService.getNotifications(userId, parseInt(limit), parseInt(offset));
  
  res.status(200).json({
    success: true,
    data: { notifications },
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user.id;
  
  await pushTokenService.markNotificationRead(notificationId, userId);
  
  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  await pushTokenService.markAllNotificationsRead(userId);
  
  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
});
