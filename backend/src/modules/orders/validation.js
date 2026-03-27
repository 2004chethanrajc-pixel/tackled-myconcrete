import Joi from 'joi';

export const createOrderSchema = Joi.object({
  customerId: Joi.string().optional().allow('', null),
  assignedFinance: Joi.string().optional().allow('', null),
  assignedPm: Joi.string().optional().allow('', null),
  productType: Joi.string().valid('concrete', 'bricks', 'other').required(),
  productDescription: Joi.string().optional().allow('', null),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().optional().default('units'),
  deliveryAddress: Joi.string().optional().allow('', null),
  floor: Joi.string().optional().allow('', null),
  driverName: Joi.string().optional().allow('', null),
  driverPhone: Joi.string().optional().allow('', null),
  vehicleNumber: Joi.string().optional().allow('', null),
  projectId: Joi.string().optional().allow('', null),
  notes: Joi.string().optional().allow('', null),
  // Admin-only fields at creation
  unitPrice: Joi.number().positive().optional(),
  totalAmount: Joi.number().positive().optional(),
  advanceAmount: Joi.number().positive().optional(),
});

export const approveOrderSchema = Joi.object({
  totalAmount: Joi.number().positive().required(),
  advanceAmount: Joi.number().positive().required(),
  unitPrice: Joi.number().positive().optional(),
  notes: Joi.string().optional().allow('', null),
});

export const updateOrderSchema = Joi.object({
  customerId: Joi.string().optional().allow('', null),
  assignedFinance: Joi.string().optional().allow('', null),
  assignedPm: Joi.string().optional().allow('', null),
  unitPrice: Joi.number().positive().optional(),
  totalAmount: Joi.number().positive().optional(),
  advanceAmount: Joi.number().positive().optional(),
  status: Joi.string().valid('pending_approval', 'placed', 'assigned', 'dispatched', 'delivered', 'invoiced', 'cancelled').optional(),
  notes: Joi.string().optional().allow('', null),
  productDescription: Joi.string().optional().allow('', null),
  quantity: Joi.number().positive().optional(),
  unit: Joi.string().optional(),
  deliveryAddress: Joi.string().optional().allow('', null),
  floor: Joi.string().optional().allow('', null),
  driverName: Joi.string().optional().allow('', null),
  driverPhone: Joi.string().optional().allow('', null),
  vehicleNumber: Joi.string().optional().allow('', null),
  projectId: Joi.string().optional().allow('', null),
});

export const paymentSchema = Joi.object({
  paymentMethod: Joi.string().valid('cash', 'bank').required(),
  upiId: Joi.string().when('paymentMethod', {
    is: 'bank',
    then: Joi.required(),
    otherwise: Joi.optional().allow('', null),
  }),
});
