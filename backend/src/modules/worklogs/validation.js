import Joi from 'joi';

export const createWorklogSchema = Joi.object({
  projectId: Joi.string()
    .required()
    .messages({
      'string.base': 'Project ID must be a string',
      'any.required': 'Project ID is required'
    }),
  floorNumber: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Floor number must be a number',
      'number.integer': 'Floor number must be an integer',
      'number.positive': 'Floor number must be a positive number',
      'any.required': 'Floor number is required'
    }),
  description: Joi.string()
    .required()
    .messages({
      'any.required': 'Description is required'
    })
});
