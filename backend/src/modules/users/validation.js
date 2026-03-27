import Joi from 'joi';

const VALID_ROLES = ['super_admin', 'admin', 'project_manager', 'site_incharge', 'finance', 'customer'];

export const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({ 'string.min': 'Name must be at least 2 characters', 'any.required': 'Name is required' }),
  email: Joi.string().email().max(120).required()
    .messages({ 'string.email': 'Please provide a valid email address', 'any.required': 'Email is required' }),
  phone: Joi.string().max(20).required()
    .messages({ 'any.required': 'Phone is required' }),
  password: Joi.string().min(6).required()
    .messages({ 'string.min': 'Password must be at least 6 characters', 'any.required': 'Password is required' }),
  role: Joi.string().valid(...VALID_ROLES).required()
    .messages({ 'any.only': `Role must be one of: ${VALID_ROLES.join(', ')}`, 'any.required': 'Role is required' }),
  date_of_joining: Joi.date().iso().optional().allow(null, ''),
  date_of_birth: Joi.date().iso().optional().allow(null, ''),
  current_address: Joi.string().max(500).optional().allow(null, ''),
  permanent_address: Joi.string().max(500).optional().allow(null, ''),
  city: Joi.string().max(100).optional().allow(null, ''),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().max(20).optional().allow(null, ''),
  email: Joi.string().email().max(120).optional(),
  date_of_joining: Joi.date().iso().optional().allow(null, ''),
  date_of_birth: Joi.date().iso().optional().allow(null, ''),
  current_address: Joi.string().max(500).optional().allow(null, ''),
  permanent_address: Joi.string().max(500).optional().allow(null, ''),
  city: Joi.string().max(100).optional().allow(null, ''),
});

export const updateRoleSchema = Joi.object({
  role: Joi.string().valid(...VALID_ROLES).required()
    .messages({ 'any.only': `Role must be one of: ${VALID_ROLES.join(', ')}`, 'any.required': 'Role is required' })
});

export const deactivateUserSchema = Joi.object({
  reason: Joi.string().optional().allow('').max(255)
});
