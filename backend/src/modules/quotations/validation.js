import Joi from 'joi';

export const createQuotationSchema = Joi.object({
  projectId: Joi.string()
    .required()
    .messages({
      'string.base': 'Project ID must be a string',
      'any.required': 'Project ID is required'
    }),
  materialCost: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .messages({
      'number.base': 'Material cost must be a number',
      'number.min': 'Material cost cannot be negative',
      'any.required': 'Material cost is required'
    }),
  labourCost: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .messages({
      'number.base': 'Labour cost must be a number',
      'number.min': 'Labour cost cannot be negative',
      'any.required': 'Labour cost is required'
    }),
  transportCost: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .messages({
      'number.base': 'Transport cost must be a number',
      'number.min': 'Transport cost cannot be negative',
      'any.required': 'Transport cost is required'
    }),
  otherCost: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .messages({
      'number.base': 'Other cost must be a number',
      'number.min': 'Other cost cannot be negative',
      'any.required': 'Other cost is required'
    }),
  totalCost: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .messages({
      'number.base': 'Total cost must be a number',
      'number.min': 'Total cost cannot be negative',
      'any.required': 'Total cost is required'
    }),
  advanceAmount: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .default(0)
    .messages({
      'number.base': 'Advance amount must be a number',
      'number.min': 'Advance amount cannot be negative'
    })
}).custom((value, helpers) => {
  const { materialCost, labourCost, transportCost, otherCost, totalCost, advanceAmount } = value;
  const calculatedTotal = materialCost + labourCost + transportCost + otherCost;
  
  // Allow small floating point differences (0.01)
  if (Math.abs(calculatedTotal - totalCost) > 0.01) {
    return helpers.error('any.invalid', {
      message: `Total cost must equal sum of all costs (${calculatedTotal.toFixed(2)})`
    });
  }
  
  // Validate advance amount doesn't exceed total cost
  if (advanceAmount && advanceAmount > totalCost) {
    return helpers.error('any.invalid', {
      message: 'Advance amount cannot exceed total cost'
    });
  }
  
  return value;
});

export const approveQuotationSchema = Joi.object({
  // No body required for approval, but keeping schema for consistency
}).unknown(true).optional();
