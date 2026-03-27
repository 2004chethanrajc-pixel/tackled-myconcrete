import express from 'express';
import * as reportController from './controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createReportSchema, approveReportSchema } from './validation.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Upload report images/videos - site_incharge only
router.post('/upload-images', authorize('site_incharge', 'super_admin'), upload.array('images', 10), reportController.uploadImages);

// Create report - site_incharge only
router.post('/', authorize('site_incharge', 'super_admin'), validate(createReportSchema), reportController.createReport);

// Get reports by project - role-based access control in service (before approving)
router.get('/project/:projectId/before', reportController.getReportsByProjectBeforeApproving);

// Get reports by project - role-based access control in service
router.get('/project/:projectId', reportController.getReportsByProject);

// Get final aggregated project report - role-based access control in service
router.get('/project/:projectId/final', reportController.getFinalProjectReport);

// Get all reports - accessible by admin, customer, finance, project_manager, site_incharge
router.get('/', authorize('admin', 'customer', 'finance', 'project_manager', 'site_incharge', 'super_admin'), reportController.getAllReports);

export default router;