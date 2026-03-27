import express from 'express';
import * as orderController from './controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createOrderSchema, approveOrderSchema, updateOrderSchema, paymentSchema } from './validation.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();
router.use(protect);

// Get all orders
router.get('/', authorize('admin', 'super_admin', 'customer', 'finance', 'project_manager'), orderController.getOrders);

// Get single order
router.get('/:id', authorize('admin', 'super_admin', 'customer', 'finance', 'project_manager'), orderController.getOrderById);

// Create order (admin sets amounts; customer creates pending_approval)
router.post('/', authorize('admin', 'super_admin', 'customer'), validate(createOrderSchema), orderController.createOrder);

// Admin approves a customer order and sets amounts
router.post('/:id/approve', authorize('admin', 'super_admin'), validate(approveOrderSchema), orderController.approveOrder);

// Admin/PM updates order (PM can only update status)
router.patch('/:id', authorize('admin', 'super_admin', 'project_manager'), validate(updateOrderSchema), orderController.updateOrder);

// Customer pays advance
router.post('/:id/pay-advance', authorize('customer'), validate(paymentSchema), orderController.payAdvance);

// Customer pays balance
router.post('/:id/pay-balance', authorize('customer'), validate(paymentSchema), orderController.payBalance);

// Finance verifies payment (advance or balance)
router.post('/:id/verify/:paymentType', authorize('finance', 'admin', 'super_admin'), orderController.verifyPayment);

// Cancel order
router.patch('/:id/cancel', authorize('admin', 'super_admin', 'customer'), orderController.cancelOrder);

export default router;
