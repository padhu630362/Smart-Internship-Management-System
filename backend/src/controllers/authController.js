import { User, ROLES, ALLOWED_SELF_REGISTRATION_ROLES } from '../models/User.js';
import { hashPassword, generateRandomToken, hashResetToken } from '../utils/security.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { recordAuditLog } from '../services/auditService.js';

/**
 * Handle new user registration.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role = ROLES.STUDENT, profile } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Verify duplicate email
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return next(new AppError('An account with this email address already exists.', 409, 'DUPLICATE_EMAIL'));
    }

    // Hash password using native scrypt
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      profile: profile || {},
      status: 'active',
    });

    // Generate JWT token
    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user authentication and token issuance.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Query user with passwordHash included
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    if (user.status === 'suspended') {
      return next(new AppError('Your account has been suspended. Please contact administration.', 403, 'ACCOUNT_SUSPENDED'));
    }

    if (user.status === 'inactive') {
      return next(new AppError('Your account has been deactivated. Please contact administration.', 403, 'ACCOUNT_DEACTIVATED'));
    }

    if (user.status === 'pending_verification') {
      return next(new AppError('Your account is pending verification.', 403, 'ACCOUNT_PENDING'));
    }

    // Verify password match
    const isMatch = await user.isValidPassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    // Generate JWT token
    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    // Remove passwordHash from response
    user.passwordHash = undefined;

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile of the currently authenticated user.
 */
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};

/**
 * Handle user logout.
 */
export const logout = (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please clear client-side credentials.',
  });
};

/**
 * Generate password reset token.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Do not disclose whether email exists for anti-enumeration security
      return res.status(200).json({
        success: true,
        message: 'If the email exists in our records, a password reset link has been dispatched.',
      });
    }

    // Generate secure reset token
    const resetToken = generateRandomToken(32);
    const hashedToken = hashResetToken(resetToken);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    // Record security audit log
    await recordAuditLog({
      action: 'PASSWORD_RESET_REQUESTED',
      req,
      targetUser: user._id,
      resourceType: 'Auth',
      details: { email: user.email },
    });

    // In dev / test mode, return token for verification without requiring an external SMTP service
    const isDev = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

    res.status(200).json({
      success: true,
      message: 'If the email exists in our records, a password reset link has been dispatched.',
      ...(isDev && { devResetToken: resetToken }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using verification token.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const hashedToken = hashResetToken(token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return next(new AppError('Password reset token is invalid or has expired.', 400, 'INVALID_RESET_TOKEN'));
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      return next(new AppError('Your account has been deactivated or suspended. Password cannot be reset.', 403, 'ACCOUNT_INACTIVE'));
    }

    // Set new password, update passwordChangedAt (revokes previous sessions)
    user.passwordHash = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();


    // Record security audit log
    await recordAuditLog({
      action: 'PASSWORD_RESET_COMPLETED',
      req,
      targetUser: user._id,
      resourceType: 'Auth',
      details: { email: user.email },
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You may now sign in.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
};
