import Joi from 'joi';

export const createReportSchema = Joi.object({
  projectId: Joi.string()
    .required()
    .messages({
      'string.base': 'Project ID must be a string',
      'any.required': 'Project ID is required'
    }),
  totalFloors: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Total floors must be a number',
      'number.integer': 'Total floors must be an integer',
      'number.positive': 'Total floors must be a positive number',
      'any.required': 'Total floors is required'
    }),
  dimensions: Joi.string()
    .required()
    .messages({
      'any.required': 'Dimensions is required'
    }),
  images: Joi.array()
    .items(Joi.string())
    .required()
    .messages({
      'array.base': 'Images must be an array',
      'any.required': 'Images is required'
    }),
  remarks: Joi.string()
    .optional()
    .allow('')
    .max(1000)
    .messages({
      'string.max': 'Remarks cannot exceed 1000 characters'
    })
});

export const approveReportSchema = Joi.object({
  // No body required for approval, but keeping schema for consistency
});
