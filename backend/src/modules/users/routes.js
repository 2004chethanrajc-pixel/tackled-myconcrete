import express from 'express';
import * as userController from './controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createUserSchema, updateUserSchema, updateRoleSchema, deactivateUserSchema } from './validation.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'super_admin', 'project_manager', 'site_incharge', 'finance'), userController.getAllUsers);
router.get('/:id', authorize('admin', 'super_admin', 'project_manager', 'site_incharge', 'finance', 'customer'), userController.getUserById);
router.post('/', authorize('admin', 'super_admin'), validate(createUserSchema), userController.createUser);
router.patch('/:id/details', authorize('admin', 'super_admin'), validate(updateUserSchema), userController.updateUserDetails);
router.patch('/:id/role', authorize('admin', 'super_admin'), validate(updateRoleSchema), userController.updateUserRole);
router.patch('/:id/deactivate', authorize('admin', 'super_admin'), validate(deactivateUserSchema), userController.deactivateUser);
router.patch('/:id/activate', authorize('admin', 'super_admin'), userController.activateUser);
router.get('/:id/session-status', authorize('admin', 'super_admin'), userController.getSessionStatus);
router.delete('/:id/sessions', authorize('admin', 'super_admin'), userController.forceLogoutUser);

export default router;
