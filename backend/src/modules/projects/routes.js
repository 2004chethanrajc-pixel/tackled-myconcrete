import express from 'express';
import * as projectController from './controller.js';
import * as floorsController from './floorsController.js';
import * as ratingsController from '../ratings/controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createProjectSchema, assignPmSchema, assignSiteSchema, assignFinanceSchema, updateStatusSchema } from './validation.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create project - admin and customer
router.post('/', authorize('admin', 'super_admin', 'customer'), validate(createProjectSchema), projectController.createProject);

// Get all projects - role-based filtering applied in service
router.get('/', projectController.getAllProjects);

// Get project by ID - role-based access control applied in service
router.get('/:id', projectController.getProjectById);

// Assign PM - admin only
router.patch('/:id/assign-pm', authorize('admin', 'super_admin'), validate(assignPmSchema), projectController.assignProjectManager);

// Assign site incharge - project_manager only
router.patch('/:id/assign-site', authorize('project_manager', 'super_admin'), validate(assignSiteSchema), projectController.assignSiteIncharge);

// Assign finance - admin only
router.patch('/:id/assign-finance', authorize('admin', 'super_admin'), validate(assignFinanceSchema), projectController.assignFinance);

// Update status - role validation happens in service based on transition rules
router.patch('/:id/status', validate(updateStatusSchema), projectController.updateProjectStatus);

// Delete project - admin only
router.delete('/:id', authorize('admin', 'super_admin'), projectController.deleteProject);

// --- Floors ---
router.get('/:id/floors', floorsController.getFloors);
router.post('/:id/floors', authorize('admin', 'super_admin'), floorsController.addFloor);
router.delete('/:id/floors/:floorId', authorize('admin', 'super_admin'), floorsController.deleteFloor);
router.patch('/:id/floors/:floorId/assign-site', authorize('project_manager', 'super_admin'), floorsController.assignFloorSite);
router.patch('/:id/floors/:floorId/status', authorize('admin', 'super_admin', 'site_incharge'), floorsController.updateFloorStatus);
router.get('/:id/floors/:floorId/logs', floorsController.getFloorLogs);

// --- Ratings ---
router.post('/:id/ratings', authorize('customer'), ratingsController.submitRating);
router.get('/:id/ratings', authorize('customer', 'admin', 'super_admin', 'project_manager', 'site_incharge', 'finance'), ratingsController.getProjectRating);

export default router;
