import express from 'express';
import * as visitController from './controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createVisitSchema, rejectVisitSchema } from './validation.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create visit - project_manager only (NO VALIDATION)
router.post('/', authorize('project_manager', 'super_admin'), visitController.createVisit);

// Get visits by project - role-based access control in service
router.get('/project/:projectId', visitController.getVisitsByProject);

// Reject visit - site_incharge, customer, project_manager, or admin (TEMPORARILY DISABLE VALIDATION FOR DEBUGGING)
router.patch('/:id/reject', authorize('site_incharge', 'customer', 'project_manager', 'admin', 'super_admin'), visitController.rejectVisit);

// Complete visit - site_incharge only
router.patch('/:id/complete', authorize('site_incharge', 'super_admin'), visitController.completeVisit);

export default router;
