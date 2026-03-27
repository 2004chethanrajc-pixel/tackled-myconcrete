import express from 'express';
import * as quotationController from './controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createQuotationSchema, approveQuotationSchema } from './validation.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create quotation - finance only
router.post('/', authorize('finance', 'super_admin'), validate(createQuotationSchema), quotationController.createQuotation);

// Get quotations by project - role-based access control in service (MUST BE BEFORE /:id route)
router.get('/project/:projectId', quotationController.getQuotationsByProject);

// Get single quotation - role-based access control in service (for viewing before approval)
router.get('/:id', quotationController.getQuotationById);

// Approve quotation - customer only
router.patch('/:id/approve', authorize('customer', 'super_admin'), quotationController.approveQuotation);

export default router;
