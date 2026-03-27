import Joi from 'joi';

const VALID_STATUSES = [
  'CREATED',
  'PM_ASSIGNED',
  'VISIT_DONE',
  'REPORT_SUBMITTED',
  'QUOTATION_GENERATED',
  'CUSTOMER_APPROVED',
  'ADVANCE_PENDING',
  'ADVANCE_PAID',
  'WORK_STARTED',
  'COMPLETED',
  'CLOSED'
];

export const createProjectSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(150)
    .required()
    .messages({
      'string.min': 'Project name must be at least 2 characters',
      'string.max': 'Project name cannot exceed 150 characters',
      'any.required': 'Project name is required'
    }),
  location: Joi.string()
    .required()
    .messages({
      'any.required': 'Location is required'
    }),
  customerId: Joi.string()
    .required()
    .messages({
      'any.required': 'Customer ID is required'
    }),
  pmId: Joi.string()
    .optional()
    .messages({
      'string.base': 'Project Manager ID must be a string'
    })
});

export const assignPmSchema = Joi.object({
  pmId: Joi.string()
    .required()
    .messages({
      'any.required': 'Project Manager ID is required'
    })
});

export const assignSiteSchema = Joi.object({
  siteId: Joi.string()
    .required()
    .messages({
      'any.required': 'Site Incharge ID is required'
    })
});

export const assignFinanceSchema = Joi.object({
  financeId: Joi.string()
    .required()
    .messages({
      'any.required': 'Finance ID is required'
    })
});

export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...VALID_STATUSES)
    .required()
    .messages({
      'any.only': `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      'any.required': 'Status is required'
    })
});
