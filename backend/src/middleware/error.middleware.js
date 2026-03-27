import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};

export const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Multer-specific errors with descriptive messages
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = `File too large. Maximum allowed size is 100MB per file.`;
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400;
    message = `Too many files. Maximum 10 files allowed per upload.`;
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = `Unexpected file field. Use the correct upload field name.`;
  } else if (err.message && err.message.includes('Only image, video, and audio files are allowed')) {
    statusCode = 400;
    message = err.message;
  } else if (!(err instanceof ApiError)) {
    // Mask other non-ApiError details in production
    statusCode = 500;
    message = config.env === 'development' ? err.message : 'Internal Server Error';
  }

  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  // Include stack trace in development mode
  if (config.env === 'development') {
    response.stack = err.stack;
  }

  // Log error details
  console.error({
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message,
    stack: err.stack,
  });

  res.status(statusCode).json(response);
};
