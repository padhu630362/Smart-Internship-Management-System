import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

/**
 * Middleware to authenticate requests using JWT Bearer tokens.
 */
export const authenticateToken = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return next(
        new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED')
      );
    }

    // Verify token signature and expiration
    const payload = verifyToken(token);

    // Fetch user from DB to ensure user is active and has not been deleted or suspended
    const user = await User.findById(payload.id);
    if (!user) {
      return next(
        new AppError('The account belonging to this token no longer exists.', 401, 'USER_NOT_FOUND')
      );
    }

    if (user.status === 'suspended') {
      return next(
        new AppError('Your account has been suspended. Please contact administration.', 403, 'ACCOUNT_SUSPENDED')
      );
    }

    if (user.status === 'inactive') {
      return next(
        new AppError('Your account has been deactivated. Please contact administration.', 403, 'ACCOUNT_DEACTIVATED')
      );
    }

    if (user.status === 'pending_verification') {
      return next(
        new AppError('Your account is pending verification.', 403, 'ACCOUNT_PENDING')
      );
    }

    // Session revocation: Check if password was changed after token issuance
    if (user.passwordChangedAt && payload.iat) {
      const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (payload.iat < changedTimestamp) {
        return next(
          new AppError('Your session has expired due to a recent password change. Please sign in again.', 401, 'TOKEN_EXPIRED')
        );
      }
    }

    // Attach user and payload to Express request context
    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) middleware generator.
 * @param {...string} allowedRoles - Permitted roles (e.g. 'admin', 'coordinator')
 */
export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError('Authentication required before checking permissions.', 401, 'UNAUTHORIZED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden. This resource requires one of [${allowedRoles.join(', ')}]. Your current role is '${req.user.role}'.`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

/**
 * Optional authentication middleware: attaches user if valid token exists,
 * otherwise proceeds normally without error.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const payload = verifyToken(token);
          const user = await User.findById(payload.id);
          if (user && user.status === 'active') {
            req.user = user;
            req.tokenPayload = payload;
          }
        } catch {
          // Ignore invalid or expired token
        }
      }
    }
    next();
  } catch {
    next();
  }
};

export default {
  authenticateToken,
  requireRoles,
  optionalAuth,
};
