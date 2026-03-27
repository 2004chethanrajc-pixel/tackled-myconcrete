import Joi from 'joi';

// Accept any data for create visit - validation in service layer
export const createVisitSchema = Joi.object().unknown(true);

export const rejectVisitSchema = Joi.object({
  rejectionReason: Joi.string()
    .min(3)
    .required()
    .messages({
      'string.min': 'Rejection reason must be at least 3 characters',
      'any.required': 'Rejection reason is required',
      'string.base': 'Rejection reason must be a string',
      'string.empty': 'Rejection reason cannot be empty'
    }),
  rejectionDescription: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.min': 'Rejection description must be at least 10 characters',
      'any.required': 'Rejection description is required',
      'string.base': 'Rejection description must be a string',
      'string.empty': 'Rejection description cannot be empty'
    })
}).unknown(true);
