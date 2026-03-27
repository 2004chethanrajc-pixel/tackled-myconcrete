import express from 'express';
import * as worklogController from './controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createWorklogSchema } from './validation.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create worklog - site_incharge only
router.post('/', authorize('site_incharge', 'super_admin'), validate(createWorklogSchema), worklogController.createWorklog);

// Add images/videos to worklog - site_incharge only (no validation needed for file uploads)
router.post('/:id/images', authorize('site_incharge', 'super_admin'), upload.array('images', 10), worklogController.addWorklogImages);

// Remove image from worklog - site_incharge only
router.delete('/:id/images', authorize('site_incharge', 'super_admin'), worklogController.removeWorklogImage);

// Get worklogs by project - role-based access control in service
router.get('/project/:projectId', worklogController.getWorklogsByProject);

export default router;
