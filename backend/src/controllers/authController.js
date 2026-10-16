import { User, ROLES, ALLOWED_SELF_REGISTRATION_ROLES } from '../models/User.js';
import {
  hashPassword,
  generateRandomToken,
  hashResetToken,
  generateSixDigitCode,
} from '../utils/security.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { getFirebaseAuth } from '../config/firebaseAdmin.js';
import { sendPasswordResetCode, sendTwoFactorCode } from '../services/emailService.js';
import { logger } from '../utils/logger.js';

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

    // Two-Step Verification (2FA) if explicitly enabled on account
    if (user.twoFactorEnabled) {
      const sixDigitCode = generateSixDigitCode();
      const hashedCode = hashResetToken(sixDigitCode);

      user.twoFactorCode = hashedCode;
      user.twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      user.twoFactorAttempts = 0;
      user.twoFactorCooldown = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown
      await user.save({ validateBeforeSave: false });

      // Send code in real-time to personal email
      const emailResult = await sendTwoFactorCode({
        to: user.email,
        name: user.name,
        code: sixDigitCode,
      });

      if (!emailResult.sent && process.env.NODE_ENV !== 'test') {
        return next(
          new AppError(
            emailResult.error
              ? `Failed to send 2FA verification email: ${emailResult.error}`
              : 'Email delivery failed. SMTP service is unconfigured or unable to reach the mail server.',
            502,
            'EMAIL_DELIVERY_FAILED'
          )
        );
      }

      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        email: user.email,
        message: `A 6-digit verification code has been dispatched to ${user.email}. Please enter it to complete sign-in.`,
      });
    }

    // Direct successful authentication
    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

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
 * Verify 6-digit Two-Step Verification code and finalize login session.
 */
export const verifyTwoFactor = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return next(new AppError('Email and 6-digit verification code are required.', 400, 'MISSING_FIELDS'));
    }

    const normalizedEmail = email.toLowerCase().trim();
    const rawCode = String(code).trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+twoFactorCode +twoFactorExpires +twoFactorAttempts'
    );

    if (!user || !user.twoFactorCode || !user.twoFactorExpires) {
      return next(new AppError('No active two-step verification request found. Please sign in again.', 400, 'INVALID_2FA_SESSION'));
    }

    if (user.twoFactorExpires < new Date()) {
      user.twoFactorCode = undefined;
      user.twoFactorExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new AppError('Verification code has expired. Please request a new code.', 400, 'CODE_EXPIRED'));
    }

    if ((user.twoFactorAttempts || 0) >= 5) {
      user.twoFactorCode = undefined;
      user.twoFactorExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new AppError('Too many failed verification attempts. Please sign in again.', 429, 'MAX_ATTEMPTS_EXCEEDED'));
    }

    const hashedInputCode = hashResetToken(rawCode);
    if (hashedInputCode !== user.twoFactorCode) {
      user.twoFactorAttempts = (user.twoFactorAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      const remaining = Math.max(0, 5 - user.twoFactorAttempts);
      return next(
        new AppError(
          `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
          400,
          'INVALID_CODE'
        )
      );
    }

    // Code verified successfully: clear 2FA state and update login timestamp
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    user.twoFactorAttempts = 0;
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Two-step verification successful. Welcome back!',
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
 * Resend 6-digit Two-Step Verification code.
 */
export const resendTwoFactorCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new AppError('Email is required to resend verification code.', 400, 'MISSING_EMAIL'));
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+twoFactorCooldown');

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the account exists, a new verification code has been dispatched.',
      });
    }

    if (user.twoFactorCooldown && user.twoFactorCooldown > new Date()) {
      const waitSeconds = Math.ceil((user.twoFactorCooldown.getTime() - Date.now()) / 1000);
      return next(
        new AppError(
          `Please wait ${waitSeconds} seconds before requesting another verification code.`,
          429,
          'RATE_LIMITED'
        )
      );
    }

    const sixDigitCode = generateSixDigitCode();
    const hashedCode = hashResetToken(sixDigitCode);

    user.twoFactorCode = hashedCode;
    user.twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.twoFactorAttempts = 0;
    user.twoFactorCooldown = new Date(Date.now() + 60 * 1000); // 60s cooldown
    await user.save({ validateBeforeSave: false });

    const emailResult = await sendTwoFactorCode({
      to: user.email,
      name: user.name,
      code: sixDigitCode,
    });

    if (!emailResult.sent && process.env.NODE_ENV !== 'test') {
      return next(
        new AppError(
          emailResult.error
            ? `Failed to send 2FA verification email: ${emailResult.error}`
            : 'Email delivery failed. SMTP service is unconfigured or unable to reach the mail server.',
          502,
          'EMAIL_DELIVERY_FAILED'
        )
      );
    }

    res.status(200).json({
      success: true,
      message: `A new 6-digit verification code has been dispatched to ${user.email}.`,
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
 * Request password reset verification code (6-digit OTP).
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select('+resetPasswordCooldown');
    if (!user) {
      // Anti-enumeration safe response
      return res.status(200).json({
        success: true,
        message: 'If the email exists in our records, a 6-digit verification code has been dispatched.',
      });
    }

    // Rate-limiting cooldown: prevent flooding (60 seconds)
    if (user.resetPasswordCooldown && user.resetPasswordCooldown > new Date()) {
      const waitSeconds = Math.ceil((user.resetPasswordCooldown.getTime() - Date.now()) / 1000);
      return next(
        new AppError(
          `Please wait ${waitSeconds} seconds before requesting another verification code.`,
          429,
          'RATE_LIMITED'
        )
      );
    }

    // Generate secure 6-digit OTP and reset token
    const sixDigitCode = generateSixDigitCode();
    const hashedCode = hashResetToken(sixDigitCode);
    const resetToken = generateRandomToken(32);
    const hashedToken = hashResetToken(resetToken);

    user.resetPasswordCode = hashedCode;
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    user.resetPasswordAttempts = 0;
    user.resetPasswordCooldown = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown
    await user.save({ validateBeforeSave: false });

    // Send code via email service (nodemailer SMTP or fallback logger)
    const emailResult = await sendPasswordResetCode({
      to: user.email,
      name: user.name,
      code: sixDigitCode,
    });

    if (!emailResult.sent && process.env.NODE_ENV !== 'test') {
      return next(
        new AppError(
          emailResult.error
            ? `Failed to send verification email: ${emailResult.error}. Please check your SMTP configuration.`
            : 'Email delivery failed. SMTP service is unconfigured or unable to reach the mail server.',
          502,
          'EMAIL_DELIVERY_FAILED'
        )
      );
    }

    res.status(200).json({
      success: true,
      message: 'A 6-digit verification code has been dispatched to your email address.',
      provider: emailResult.provider,
      ...(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'
        ? { devResetToken: resetToken, devVerificationCode: sixDigitCode, token: resetToken }
        : {}),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 6-digit password reset verification code.
 */
export const verifyResetCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const rawCode = String(code).trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+resetPasswordCode +resetPasswordToken +resetPasswordExpires +resetPasswordAttempts'
    );

    if (!user || !user.resetPasswordCode || !user.resetPasswordExpires) {
      return next(new AppError('Invalid or expired verification code request.', 400, 'INVALID_RESET_REQUEST'));
    }

    if (user.resetPasswordExpires < new Date()) {
      return next(new AppError('Verification code has expired. Please request a new code.', 400, 'CODE_EXPIRED'));
    }

    if ((user.resetPasswordAttempts || 0) >= 5) {
      user.resetPasswordCode = undefined;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(
        new AppError(
          'Too many failed verification attempts. This code is now invalid. Please request a new code.',
          429,
          'MAX_ATTEMPTS_EXCEEDED'
        )
      );
    }

    const hashedInputCode = hashResetToken(rawCode);
    if (hashedInputCode !== user.resetPasswordCode) {
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      const remaining = Math.max(0, 5 - user.resetPasswordAttempts);
      return next(
        new AppError(
          `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
          400,
          'INVALID_CODE'
        )
      );
    }

    // Success: code verified! Refresh resetToken for subsequent reset-password call
    const resetToken = generateRandomToken(32);
    user.resetPasswordToken = hashResetToken(resetToken);
    user.resetPasswordAttempts = 0;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Verification code confirmed. You may now set your new password.',
      data: {
        resetToken,
        email: normalizedEmail,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using verification token or verified 6-digit code.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, email, code, newPassword } = req.body;

    let user = null;

    if (token) {
      const hashedToken = hashResetToken(token);
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+resetPasswordToken +resetPasswordExpires');
    } else if (email && code) {
      const normalizedEmail = email.toLowerCase().trim();
      const hashedCode = hashResetToken(String(code).trim());
      user = await User.findOne({
        email: normalizedEmail,
        resetPasswordCode: hashedCode,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+resetPasswordCode +resetPasswordExpires');
    }

    if (!user) {
      return next(
        new AppError('Password reset authorization is invalid or has expired.', 400, 'INVALID_RESET_AUTHORIZATION')
      );
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      return next(
        new AppError('Your account has been deactivated or suspended. Password cannot be reset.', 403, 'ACCOUNT_INACTIVE')
      );
    }

    // Set new password, update passwordChangedAt (revokes previous sessions)
    user.passwordHash = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    user.resetPasswordToken = undefined;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;
    user.resetPasswordCooldown = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You may now sign in with your new credentials.',
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
          logger.warn(`Firebase Admin ID token verification error: ${firebaseErr.message}`);
          if (isDevOrTest && credential && credential.includes('.')) {
            try {
              const parts = credential.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
                if (payload && payload.email && (payload.iss?.includes('securetoken.google.com') || payload.iss?.includes('accounts.google.com'))) {
                  googlePayload = {
                    sub: payload.user_id || payload.sub,
                    email: payload.email,
                    name: payload.name || req.body.name || payload.email.split('@')[0],
                    picture: payload.picture || req.body.picture || 'https://lh3.googleusercontent.com/a/default-user',
                    email_verified: payload.email_verified,
                  };
                  verified = true;
                  logger.info(`Dev fallback: Authenticated Firebase user from token payload: ${payload.email}`);
                }
              }
            } catch (decodeErr) {
              // Ignore decode fallback error
            }
          }
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

      try {
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
      } catch (createErr) {
        // Concurrency guard: If a simultaneous request created the account concurrently
        if (createErr.code === 11000) {
          user = await User.findOne({ email });
          if (!user) throw createErr;
          isNewUser = false;
        } else {
          throw createErr;
        }
      }
    }

    // Issue JWT token
    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
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
  verifyTwoFactor,
  resendTwoFactorCode,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  googleLogin,
};
