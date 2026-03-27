import express from 'express';
import * as sitePlanController from './controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { uploadPDF } from '../../middleware/upload.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Upload site plan - admin, project_manager, customer
router.post(
  '/projects/:projectId/site-plans',
  authorize('admin', 'super_admin', 'project_manager', 'customer'),
  uploadPDF.single('sitePlan'),
  sitePlanController.uploadSitePlan
);

// Get site plans for a project - all authenticated users
router.get(
  '/projects/:projectId/site-plans',
  sitePlanController.getSitePlansByProject
);

// Delete site plan - admin, super_admin, or uploader
router.delete(
  '/site-plans/:planId',
  sitePlanController.deleteSitePlan
);

export default router;
