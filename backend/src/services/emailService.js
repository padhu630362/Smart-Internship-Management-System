import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter = null;

function getFromAddress() {
  const from = env.EMAIL_FROM || env.SMTP_USER || 'InternHub Security <security@internhub.edu>';
  if (from.includes('<') && from.includes('>')) return from;
  return `InternHub Security <${from}>`;
}

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
          secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
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
        from: getFromAddress(),
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
      return {
        sent: false,
        provider: 'smtp',
        error: err.message,
        message: `Failed to dispatch verification email: ${err.message}`,
      };
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
    error: missingConfigs.length > 0 ? `Missing SMTP configuration (${missingConfigs.join(', ')})` : 'SMTP service unavailable',
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
        from: getFromAddress(),
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
      return {
        sent: false,
        provider: 'smtp',
        error: err.message,
        message: `Failed to deliver verification email: ${err.message}`,
      };
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
    error: missingConfigs.length > 0 ? `Missing SMTP configuration (${missingConfigs.join(', ')})` : 'SMTP service unavailable',
    message: 'Verification code generated. Please check your email inbox and enter the 6-digit code.',
  };
}

/**
 * Send official internship completion certificate with attached PDF document.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient student's registered email
 * @param {string} options.studentName - Full name of student
 * @param {string} options.internshipTitle - Title of internship role
 * @param {string} options.companyName - Name of host organization
 * @param {string} options.certificateNumber - Unique certificate identifier
 * @param {string} options.verificationCode - Tamper-evident verification token
 * @param {Date|string} options.startDate - Verified actual internship start date
 * @param {Date|string} options.endDate - Verified actual internship end date
 * @param {Buffer} options.pdfBuffer - Binary Buffer containing the generated PDF
 * @returns {Promise<{ sent: boolean, provider: string, messageId?: string, error?: string }>}
 */
export async function sendCertificateEmail({
  to,
  studentName = 'Student',
  internshipTitle = 'Internship Program',
  companyName = 'Partner Enterprise',
  certificateNumber,
  verificationCode,
  startDate,
  endDate,
  pdfBuffer,
}) {
  const mailTransporter = getTransporter();
  const filename = `Certificate-${certificateNumber || 'SIMS'}.pdf`;
  const formattedStart = startDate
    ? new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';
  const formattedEnd = endDate
    ? new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  if (mailTransporter) {
    try {
      const attachments = [];
      if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
        attachments.push({
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      }

      const info = await mailTransporter.sendMail({
        from: getFromAddress(),
        to,
        subject: `Official Internship Completion Certificate: ${internshipTitle}`,
        text: `Hello ${studentName},\n\nCongratulations on successfully completing your internship as "${internshipTitle}" at ${companyName}.\n\nVerified Tenure: ${formattedStart} to ${formattedEnd}\nCredential ID: ${certificateNumber}\nVerification Code: ${verificationCode}\n\nYour official Completion Certificate is attached to this email as a PDF. You can also view or download it anytime from the InternHub Student Portal, or verify its authenticity at /verify-certificate/${verificationCode}.\n\nBest regards,\nThe InternHub Academic & Industry Placement Office`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #722F37; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">InternHub</h1>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Official Credential Award</p>
            </div>
            <div style="background: #fdfaf8; border: 1px solid #f3e8df; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">Dear <strong>${studentName}</strong>,</p>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                Congratulations! Your internship has been officially approved as completed. Your verified completion certificate has been issued and is attached to this email.
              </p>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                  <tr>
                    <td style="color: #64748b; padding: 4px 0; width: 140px;">Position / Role:</td>
                    <td style="font-weight: 700; color: #0f172a; padding: 4px 0;">${internshipTitle}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;">Host Enterprise:</td>
                    <td style="font-weight: 700; color: #0f172a; padding: 4px 0;">${companyName}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;">Tenure Period:</td>
                    <td style="color: #0f172a; padding: 4px 0;">${formattedStart} – ${formattedEnd}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;">Credential ID:</td>
                    <td style="font-family: monospace; font-weight: 700; color: #722F37; padding: 4px 0;">${certificateNumber}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;">Verification Code:</td>
                    <td style="font-family: monospace; color: #0369a1; padding: 4px 0;">${verificationCode}</td>
                  </tr>
                </table>
              </div>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                A tamper-evident PDF copy of your certificate is attached. You may present this certificate for academic accreditation, portfolio verification, or employment review.
              </p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} InternHub Platform &bull; Real-Time Institutional Internship Governance
            </div>
          </div>
        `,
        attachments,
      });

      logger.info(`Certificate email dispatched to ${to} (MessageId: ${info.messageId})`);
      return { sent: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      logger.error(`Failed to dispatch certificate email via SMTP to ${to}: ${err.message}`);
      return {
        sent: false,
        provider: 'smtp',
        error: err.message,
      };
    }
  }

  // Fallback: SMTP not configured or failed to connect
  const missingConfigs = [];
  if (!env.SMTP_USER) missingConfigs.push('SMTP_USER');
  if (!env.SMTP_PASS) missingConfigs.push('SMTP_PASS');

  logger.warn(`
========================================================================
[INTERNHUB CERTIFICATE DISPATCH - SIMULATED / CONSOLE]
Recipient: ${to} (${studentName})
Internship: ${internshipTitle} @ ${companyName} (${formattedStart} - ${formattedEnd})
Certificate Number: [ ${certificateNumber} ]
Verification Code: [ ${verificationCode} ]
PDF Attachment: ${pdfBuffer ? `${pdfBuffer.length} bytes` : 'None'}
SMTP Status: ${missingConfigs.length > 0 ? `Unconfigured (${missingConfigs.join(', ')})` : 'Connection Error'}
========================================================================
  `);

  return {
    sent: false,
    provider: 'console',
    error: missingConfigs.length > 0 ? `Missing SMTP configuration (${missingConfigs.join(', ')})` : 'SMTP service unavailable',
  };
}

export default {
  sendTwoFactorCode,
  sendPasswordResetCode,
  sendCertificateEmail,
};
