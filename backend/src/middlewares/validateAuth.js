import { AppError } from '../utils/AppError.js';
import { ROLES, ALLOWED_SELF_REGISTRATION_ROLES } from '../models/User.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/**
 * Validates registration payload and strictly blocks elevated role self-assignment.
 */
export const validateRegister = (req, res, next) => {
  const { name, email, password, role } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Full name is required and must be at least 2 characters.' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (!password || typeof password !== 'string' || !PASSWORD_REGEX.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters long and contain at least one letter and one number.',
    });
  }

  // Check role security
  if (role) {
    if (role === ROLES.ADMIN || role === ROLES.COORDINATOR) {
      return next(
        new AppError(
          `Security violation: Self-registration for elevated role '${role}' is strictly prohibited. Administrative accounts must be provisioned internally.`,
          403,
          'PRIVILEGE_ESCALATION_BLOCKED'
        )
      );
    }

    if (!ALLOWED_SELF_REGISTRATION_ROLES.includes(role)) {
      errors.push({
        field: 'role',
        message: `Invalid role '${role}'. Self-registration is only allowed for: ${ALLOWED_SELF_REGISTRATION_ROLES.join(', ')}.`,
      });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Registration input validation failed.', 400, 'VALIDATION_ERROR', errors));
  }

  next();
};

/**
 * Validates login credentials format.
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Valid email is required.' });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required.' });
  }

  if (errors.length > 0) {
    return next(new AppError('Invalid login credentials format.', 400, 'VALIDATION_ERROR', errors));
  }

  next();
};

/**
 * Validates forgot password request payload.
 */
export const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return next(new AppError('Please provide a valid email address.', 400, 'VALIDATION_ERROR'));
  }
  next();
};

/**
 * Validates reset password payload.
 */
export const validateResetPassword = (req, res, next) => {
  const { token, newPassword } = req.body;
  const errors = [];

  if (!token || typeof token !== 'string') {
    errors.push({ field: 'token', message: 'Reset token is required.' });
  }

  if (!newPassword || typeof newPassword !== 'string' || !PASSWORD_REGEX.test(newPassword)) {
    errors.push({
      field: 'newPassword',
      message: 'New password must be at least 8 characters long with letters and numbers.',
    });
  }

  if (errors.length > 0) {
    return next(new AppError('Password reset validation failed.', 400, 'VALIDATION_ERROR', errors));
  }

  next();
};

export default {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
};
