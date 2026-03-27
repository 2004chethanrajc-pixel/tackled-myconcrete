import Joi from 'joi';

export const createPaymentSchema = Joi.object({
  projectId: Joi.string()
    .required()
    .messages({
      'string.base': 'Project ID must be a string',
      'any.required': 'Project ID is required'
    }),
  amount: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.positive': 'Amount must be a positive number',
      'any.required': 'Amount is required'
    }),
  type: Joi.string()
    .valid('advance', 'final', 'extra')
    .required()
    .messages({
      'any.only': 'Payment type must be advance, final, or extra',
      'any.required': 'Payment type is required'
    }),
  paymentMethod: Joi.string()
    .valid('cash', 'bank')
    .required()
    .messages({
      'any.only': 'Payment method must be either cash or bank',
      'any.required': 'Payment method is required'
    }),
  upiId: Joi.string()
    .when('paymentMethod', {
      is: 'bank',
      then: Joi.required().messages({
        'any.required': 'UPI ID is required for bank payments'
      }),
      otherwise: Joi.optional()
    })
});

export const verifyPaymentSchema = Joi.object({
  // No body required for verification, but keeping schema for consistency
});
