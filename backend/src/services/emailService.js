import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter = null;

function getTransporter() {
  if (!transporter && env.SMTP_USER && env.SMTP_PASS) {
    const isGmail =
      env.SMTP_HOST === 'smtp.gmail.com' ||
      (env.SMTP_USER && env.SMTP_USER.toLowerCase().endsWith('@gmail.com'));

    const transportConfig = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        }
      : {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT || 587,
          secure: env.SMTP_SECURE,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: env.NODE_ENV === 'production',
          },
        };

    transporter = nodemailer.createTransport(transportConfig);
  }
  return transporter;
}

/**
 * Send real-time Two-Step Verification (2FA) email code.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient user's name
 * @param {string} options.code - 6-digit numeric verification code
 * @returns {Promise<{ sent: boolean, provider: string, message: string }>}
 */
export async function sendTwoFactorCode({ to, name = 'User', code }) {
  const mailTransporter = getTransporter();

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: env.EMAIL_FROM || 'InternHub Security <security@internhub.edu>',
        to,
        subject: `${code} is your InternHub 2-Step Verification Code`,
        text: `Hello ${name},\n\nYour 6-digit two-step verification code for InternHub is: ${code}\n\nThis code expires in 10 minutes. Enter this code on the sign-in screen to verify your identity and access your account.\n\nIf you did not attempt to sign in to InternHub, please secure your account immediately.\n\nBest regards,\nThe InternHub Security Team`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #722F37; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">InternHub</h1>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Two-Step Verification</p>
            </div>
            <div style="background: #fdfaf8; border: 1px solid #f3e8df; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">Hello <strong>${name}</strong>,</p>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Enter this 6-digit code to complete your two-step verification:</p>
              <div style="display: inline-block; background: #722F37; color: #ffffff; font-size: 34px; font-weight: 800; letter-spacing: 8px; padding: 14px 32px; border-radius: 10px; font-family: monospace;">
                ${code}
              </div>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b;">
                Valid for <strong>10 minutes</strong>. Never share this code with anyone.
              </p>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 12px 0;">
              If you did not initiate this sign-in attempt, someone may be attempting to access your account. Please change your password immediately.
            </p>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} InternHub Platform &bull; Real-Time Institutional Internship Governance
            </div>
          </div>
        `,
      });

      logger.info(`Two-step verification email dispatched to ${to} (MessageId: ${info.messageId})`);
      return { sent: true, provider: 'smtp', message: 'Verification code sent to your personal email.' };
    } catch (err) {
      logger.error(`Failed to dispatch 2FA email via SMTP: ${err.message}`);
    }
  }

  // Fallback: When SMTP is not configured or fails
  const missingConfigs = [];
  if (!env.SMTP_USER) missingConfigs.push('SMTP_USER');
  if (!env.SMTP_PASS) missingConfigs.push('SMTP_PASS');

  logger.warn(`
========================================================================
[INTERNHUB 2-STEP VERIFICATION DISPATCH]
Recipient: ${to} (${name})
Verification Code: [ ${code} ]
Expires in: 10 minutes
SMTP Status: ${missingConfigs.length > 0 ? `Unconfigured (${missingConfigs.join(', ')})` : 'Connection Error'}
========================================================================
  `);

  return {
    sent: false,
    provider: 'console',
    message: 'Verification code generated. Please check your email inbox and enter the 6-digit code.',
  };
}

/**
 * Send password reset 6-digit verification email.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient user's name
 * @param {string} options.code - 6-digit numeric verification code
 * @returns {Promise<{ sent: boolean, provider: string, message: string }>}
 */
export async function sendPasswordResetCode({ to, name = 'User', code }) {
  const mailTransporter = getTransporter();

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: env.EMAIL_FROM || 'InternHub Security <security@internhub.edu>',
        to,
        subject: `${code} is your InternHub Password Reset Code`,
        text: `Hello ${name},\n\nYour 6-digit verification code to reset your InternHub account password is: ${code}\n\nThis verification code expires in 15 minutes. If you did not request this password reset, please ignore this email.\n\nBest regards,\nThe InternHub Team`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #722F37; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">InternHub</h1>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Password Reset Verification</p>
            </div>
            <div style="background: #fdfaf8; border: 1px solid #f3e8df; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">Hello <strong>${name}</strong>,</p>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Use the following 6-digit verification code to reset your account password:</p>
              <div style="display: inline-block; background: #722F37; color: #ffffff; font-size: 34px; font-weight: 800; letter-spacing: 8px; padding: 14px 32px; border-radius: 10px; font-family: monospace;">
                ${code}
              </div>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b;">This code is valid for <strong>15 minutes</strong> and can only be used once.</p>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 12px 0;">
              If you did not request a password reset, no further action is required; your password remains secure.
            </p>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} InternHub Platform &bull; All rights reserved.
            </div>
          </div>
        `,
      });

      logger.info(`Password reset email dispatched to ${to} (MessageId: ${info.messageId})`);
      return { sent: true, provider: 'smtp', message: 'Verification code sent to your personal email.' };
    } catch (err) {
      logger.error(`Failed to send password reset email via SMTP: ${err.message}`);
    }
  }

  // Fallback: SMTP is not configured or failed to connect
  const missingConfigs = [];
  if (!env.SMTP_USER) missingConfigs.push('SMTP_USER');
  if (!env.SMTP_PASS) missingConfigs.push('SMTP_PASS');

  logger.warn(`
========================================================================
[INTERNHUB PASSWORD RESET DISPATCH]
Recipient: ${to} (${name})
Verification Code: [ ${code} ]
Expires in: 15 minutes
SMTP Status: ${missingConfigs.length > 0 ? `Unconfigured (${missingConfigs.join(', ')})` : 'Connection Error'}
========================================================================
  `);

  return {
    sent: false,
    provider: 'console',
    message: 'Verification code generated. Please check your email inbox and enter the 6-digit code.',
  };
}

export default {
  sendTwoFactorCode,
  sendPasswordResetCode,
};
