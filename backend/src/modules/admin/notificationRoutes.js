import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { runManualCleanup } from '../../jobs/notificationCleanupJob.js';
import { getNotificationStats } from '../../utils/notificationCleanup.js';

const router = express.Router();

// Protect all routes - admin only
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// GET /api/v1/admin/notifications/stats - Get notification statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await getNotificationStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
}));

// POST /api/v1/admin/notifications/cleanup - Manual cleanup
router.post('/cleanup', asyncHandler(async (req, res) => {
  const result = await runManualCleanup();
  
  res.status(200).json({
    success: true,
    message: 'Notification cleanup completed successfully',
    data: result
  });
}));

export default router;