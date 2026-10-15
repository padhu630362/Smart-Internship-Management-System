import { User, ROLES, ALLOWED_SELF_REGISTRATION_ROLES } from '../models/User.js';
import { hashPassword, generateRandomToken, hashResetToken } from '../utils/security.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { recordAuditLog } from '../services/auditService.js';
import { getFirebaseAuth } from '../config/firebaseAdmin.js';

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

/**
 * Handle Google OAuth Sign-In and auto-provisioning.
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { credential, role = ROLES.STUDENT } = req.body;
    if (!credential) {
      return next(new AppError('Google credential token is required.', 400, 'MISSING_CREDENTIAL'));
    }

    let googlePayload;
    // Allow predictable testing and seamless development Google login
    const isDevOrTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const isMockToken = credential.startsWith('test_google_token_') || credential.startsWith('dev_google_token_');

    if (isDevOrTest && isMockToken) {
      googlePayload = {
        sub: credential.replace(/^(test_|dev_)google_token_/, 'gid_'),
        email: req.body.email || 'google.student@sims.edu',
        name: req.body.name || 'Google Student Intern',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
        email_verified: true,
      };
    } else {
      let verified = false;

      // 1. First attempt Firebase Admin ID token verification
      const firebaseAuth = getFirebaseAuth();
      if (firebaseAuth) {
        try {
          const decoded = await firebaseAuth.verifyIdToken(credential);
          googlePayload = {
            sub: decoded.uid,
            email: decoded.email,
            name: decoded.name || req.body.name || (decoded.email ? decoded.email.split('@')[0] : 'Google User'),
            picture: decoded.picture || req.body.picture || 'https://lh3.googleusercontent.com/a/default-user',
            email_verified: decoded.email_verified,
          };
          verified = true;
        } catch (firebaseErr) {
          // Token may be a direct Google OAuth token rather than Firebase JWT; fall through
        }
      }

      // 2. Fallback to standard Google OAuth tokeninfo verification
      if (!verified) {
        try {
          const response = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
            { signal: AbortSignal.timeout(6000) }
          );
          if (response.ok) {
            googlePayload = await response.json();
            if (env.GOOGLE_CLIENT_ID && googlePayload.aud !== env.GOOGLE_CLIENT_ID) {
              return next(new AppError('Google token audience mismatch.', 401, 'INVALID_AUDIENCE'));
            }
            verified = true;
          }
        } catch (fetchErr) {
          // Fall through
        }
      }

      if (!verified || !googlePayload) {
        return next(new AppError('Invalid or expired Google authentication token.', 401, 'INVALID_GOOGLE_TOKEN'));
      }
    }

    const email = googlePayload.email?.toLowerCase().trim();
    if (!email) {
      return next(new AppError('Google account does not provide a valid email address.', 400, 'NO_EMAIL'));
    }

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (user) {
      if (user.status === 'suspended') {
        return next(new AppError('Your account has been suspended. Please contact administration.', 403, 'ACCOUNT_SUSPENDED'));
      }
      if (user.status === 'inactive') {
        return next(new AppError('Your account has been deactivated. Please contact administration.', 403, 'ACCOUNT_DEACTIVATED'));
      }

      if (!user.googleId) {
        user.googleId = googlePayload.sub;
      }
      if (!user.profile?.avatarUrl && googlePayload.picture) {
        user.profile = user.profile || {};
        user.profile.avatarUrl = googlePayload.picture;
      }
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      // Self-registration via Google
      isNewUser = true;
      const randomPassword = (await generateRandomToken()) + '!A1a';
      const passwordHash = await hashPassword(randomPassword);
      const chosenRole = ALLOWED_SELF_REGISTRATION_ROLES.includes(role) ? role : ROLES.STUDENT;

      user = await User.create({
        name: googlePayload.name || email.split('@')[0],
        email,
        passwordHash,
        role: chosenRole,
        googleId: googlePayload.sub,
        authProvider: 'google',
        status: 'active',
        profile: {
          avatarUrl: googlePayload.picture || '',
        },
        lastLoginAt: new Date(),
      });
    }

    // Issue JWT token
    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    // Record security audit log
    await recordAuditLog({
      action: isNewUser ? 'USER_REGISTER_GOOGLE' : 'USER_LOGIN_GOOGLE',
      req,
      targetUser: user._id,
      resourceType: 'Auth',
      details: { email: user.email, role: user.role, provider: 'google' },
    });

    res.status(200).json({
      success: true,
      message: isNewUser ? 'Account registered successfully with Google.' : 'Google sign-in successful.',
      data: {
        user,
        token,
      },
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
  googleLogin,
};
