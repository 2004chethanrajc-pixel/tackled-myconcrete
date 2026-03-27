import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Log the raw request for debugging
      console.log('=== VALIDATION DEBUG ===');
      console.log('Request Method:', req.method);
      console.log('Request URL:', req.url);
      console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Request Body Type:', typeof req.body);
      console.log('Request Body:', JSON.stringify(req.body, null, 2));
      console.log('Body is empty?', Object.keys(req.body || {}).length === 0);
      console.log('Has files?', req.files?.length > 0);
      console.log('User Agent:', req.headers['user-agent']);
      console.log('Content-Type:', req.headers['content-type']);
      
      // Skip validation for GET requests or if no schema provided
      if (req.method === 'GET' || !schema) {
        console.log('✅ Skipping validation for GET request or no schema');
        return next();
      }
      
      // Skip validation for file uploads (multipart/form-data)
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        console.log('✅ Skipping validation for multipart/form-data (file upload)');
        return next();
      }
      
      // Check if body exists for non-GET requests
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log('❌ Request body is empty or undefined');
        return next(new ApiError(400, 'Request body is required'));
      }
      
      // Special handling for mobile app - check if role is valid
      if (req.body.role) {
        console.log('Role validation - received role:', req.body.role);
        console.log('Role type:', typeof req.body.role);
        const validRoles = ['super_admin', 'admin', 'project_manager', 'site_incharge', 'finance', 'customer'];
        console.log('Valid roles:', validRoles);
        console.log('Is role valid?', validRoles.includes(req.body.role));
      }
      
      const { error, value } = schema.validate(req.body, { abortEarly: false });
      
      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        console.log('❌ Validation errors:', JSON.stringify(errors, null, 2));
        return next(new ApiError(400, 'Validation failed', errors.map(e => e.message)));
      }
      
      console.log('✅ Validation passed');
      req.body = value;
      next();
    } catch (err) {
      console.error('❌ Validation middleware error:', err);
      next(err);
    }
  };
};
