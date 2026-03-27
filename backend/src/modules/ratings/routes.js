import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { submitRating, getProjectRating } from './controller.js';

const router = Router();

// Customer submits a rating (one-time only)
router.post('/:projectId/ratings', protect, authorize('customer'), submitRating);

// All project stakeholders can view the rating
router.get('/:projectId/ratings', protect, authorize('customer', 'admin', 'super_admin', 'project_manager', 'site_incharge', 'finance'), getProjectRating);

export default router;
