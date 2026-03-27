import express from 'express';
import * as paymentController from './controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createPaymentSchema, verifyPaymentSchema } from './validation.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create payment - customer only
router.post('/', authorize('customer', 'super_admin'), validate(createPaymentSchema), paymentController.createPayment);

// Create extra charge - finance only (no validation middleware)
router.post('/extra-charge', authorize('finance', 'super_admin'), paymentController.createExtraCharge);

// Pay extra charge - customer only (no validation middleware)
router.patch('/:id/pay-extra', authorize('customer', 'super_admin'), paymentController.payExtraCharge);

// Get payments by project - role-based access control in service (MUST BE BEFORE /:id route)
router.get('/project/:projectId', paymentController.getPaymentsByProject);

// Get single payment - role-based access control in service (for viewing before verification)
router.get('/:id', paymentController.getPaymentById);

// Verify payment - finance only
router.patch('/:id/verify', authorize('finance', 'super_admin'), paymentController.verifyPayment);

export default router;
