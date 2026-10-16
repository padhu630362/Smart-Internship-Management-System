import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Fallback handler for unmatched API routes.
 */
export const notFoundHandler = (req, res, next) => {
  next(new AppError(`The endpoint ${req.method} ${req.originalUrl} was not found on this server.`, 404, 'NOT_FOUND'));
};

/**
 * Centralized application error handling middleware.
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log error with context (suppress in test mode for operational errors)
  if (process.env.NODE_ENV !== 'test' || !err.isOperational) {
    logger.error(`${req.method} ${req.originalUrl} - ${error.message}`, error);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Invalid value for field '${err.path}': ${err.value}`;
    error = new AppError(message, 400, 'INVALID_IDENTIFIER');
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message
    }));
    error = new AppError('Database validation failed.', 400, 'VALIDATION_ERROR', details);
  }

  // Handle MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    const duplicateFields = Object.keys(err.keyValue || {});
    const isEmail = duplicateFields.includes('email');
    const message = isEmail
      ? 'An account with this email address already exists.'
      : `Duplicate value entered for field(s): ${duplicateFields.join(', ')}.`;
    error = new AppError(message, 409, isEmail ? 'DUPLICATE_EMAIL' : 'DUPLICATE_KEY_ERROR');
  }

  // Handle JSON parse syntax errors in body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('Malformed JSON payload received.', 400, 'INVALID_JSON_BODY');
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE' || err.code === 'INVALID_FILE_TYPE' || err.code === 'INVALID_FILE_MIME') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File size exceeds the maximum permitted limit of 5MB.'
      : err.message || 'File upload failed validation.';
    error = new AppError(message, 400, err.code || 'FILE_UPLOAD_ERROR');
  }

  const statusCode = error.statusCode || 500;
  const isDev = env.NODE_ENV === 'development';
  const isOperational = error.isOperational;

  // Mask non-operational internal server errors in production to avoid info leaks
  const clientMessage = (isOperational || isDev || statusCode < 500)
    ? (error.message || 'An unexpected error occurred.')
    : 'An unexpected internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: clientMessage,
      details: error.details || [],
      ...(isDev && { stack: error.stack })
    }
  });
};

export default { notFoundHandler, errorHandler };
