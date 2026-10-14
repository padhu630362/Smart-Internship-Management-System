/**
 * Operational error class representing expected domain and client errors.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (4xx, 5xx)
   * @param {string} [code] - Machine-readable error code
   * @param {Array} [details] - Additional contextual details / validation errors
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
