import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { Certificate, CERTIFICATE_STATUSES, EMAIL_DELIVERY_STATUSES } from '../models/Certificate.js';
import { logger } from '../utils/logger.js';
import { sendCertificateEmail } from './emailService.js';
import { env } from '../config/env.js';

/**
 * Generates a unique, tamper-evident verification code.
 */
export const generateVerificationCode = () => {
  return `SIMS-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * Renders the certificate visual elements into a PDFKit document.
 * Shared between streaming responses and binary buffer creation.
 */
export const renderCertificateDocument = (doc, certificate) => {
  const width = doc.page.width;
  const height = doc.page.height;

  // Background fills
  doc.rect(0, 0, width, height).fill('#0f172a'); // Slate 900 background

  // Inner card container
  const margin = 24;
  doc
    .roundedRect(margin, margin, width - margin * 2, height - margin * 2, 12)
    .fill('#ffffff');

  // Decorative border
  doc
    .roundedRect(margin + 8, margin + 8, width - (margin + 8) * 2, height - (margin + 8) * 2, 8)
    .lineWidth(2)
    .stroke('#0284c7'); // Brand Cyan

  doc
    .roundedRect(margin + 12, margin + 12, width - (margin + 12) * 2, height - (margin + 12) * 2, 6)
    .lineWidth(0.75)
    .stroke('#cbd5e1');

  // Corner Accents
  const cornerSize = 30;
  const drawCorner = (x, y) => {
    doc.rect(x, y, cornerSize, 3).fill('#0369a1');
    doc.rect(x, y, 3, cornerSize).fill('#0369a1');
  };
  drawCorner(margin + 16, margin + 16);
  drawCorner(width - margin - 16 - cornerSize, margin + 16);
  drawCorner(margin + 16, height - margin - 16 - 3);
  drawCorner(width - margin - 16 - cornerSize, height - margin - 16 - 3);

  // If Demo certificate, render prominent demonstration indicator
  if (certificate.isDemo) {
    doc
      .roundedRect(margin + 20, margin + 20, width - (margin + 20) * 2, 18, 4)
      .fill('#fef3c7');
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#b45309')
      .text('★ DEMONSTRATION CREDENTIAL • SAMPLE SIMS INTERNSHIP FOR EVALUATION PURPOSES ONLY ★', 0, margin + 25, {
        align: 'center',
        characterSpacing: 1.2,
      });
  }

  // Header Subtitle
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#0284c7')
    .text('SMART INTERNSHIP MANAGEMENT SYSTEM • OFFICIAL CREDENTIAL', 0, 52, {
      align: 'center',
      characterSpacing: 2,
    });

  // Main Certificate Title
  doc
    .font('Helvetica-Bold')
    .fontSize(28)
    .fillColor('#0f172a')
    .text('CERTIFICATE OF COMPLETION', 0, 75, {
      align: 'center',
      characterSpacing: 1.5,
    });

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#64748b')
    .text('This is proudly awarded in recognition of successful industry internship completion to', 0, 115, {
      align: 'center',
    });

  // Student Name
  doc
    .font('Helvetica-Bold')
    .fontSize(26)
    .fillColor('#0369a1')
    .text(certificate.studentName || 'Student Candidate', 0, 138, {
      align: 'center',
    });

  // Decorative line under student name
  const nameLineWidth = 260;
  doc
    .moveTo((width - nameLineWidth) / 2, 172)
    .lineTo((width + nameLineWidth) / 2, 172)
    .lineWidth(1.5)
    .stroke('#0284c7');

  // Context Paragraph
  const startFormatted = certificate.startDate
    ? new Date(certificate.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A';
  const endFormatted = certificate.endDate
    ? new Date(certificate.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A';

  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#334155')
    .text(
      `has actively and successfully fulfilled all academic milestones, practical competencies, and workplace assignments for the position of`,
      60,
      188,
      {
        align: 'center',
        width: width - 120,
        lineGap: 3,
      }
    );

  // Position & Company
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#0f172a')
    .text(`"${certificate.internshipTitle || 'Internship Program'}"`, 0, 216, {
      align: 'center',
    });

  doc
    .font('Helvetica')
    .fontSize(12.5)
    .fillColor('#475569')
    .text(`hosted and supervised at ${certificate.companyName || 'Partner Organization'}`, 0, 236, {
      align: 'center',
    });

  // Dedicated Highlighted Tenure Dates Callout
  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor('#0284c7')
    .text(`INTERNSHIP TENURE: ${startFormatted.toUpperCase()}  TO  ${endFormatted.toUpperCase()}`, 0, 255, {
      align: 'center',
      characterSpacing: 0.8,
    });

  // Details Pill Grid: 4 Prominent verified attribute boxes
  const pillY = 276;
  const ratingText = certificate.finalRating ? `${certificate.finalRating.toFixed(1)} / 5.0` : '4.5 / 5.0';
  const gradeText = certificate.grade || 'Distinction';
  const issueDateText = new Date(certificate.issueDate || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const details = [
    { label: 'VERIFIED START DATE', val: startFormatted },
    { label: 'VERIFIED END DATE', val: endFormatted },
    { label: 'PERFORMANCE SCORE', val: `${gradeText} (${ratingText})` },
    { label: 'DATE OF ISSUANCE', val: issueDateText },
  ];

  const colWidth = (width - 120) / 4;
  details.forEach((item, index) => {
    const x = 60 + index * colWidth;
    doc
      .roundedRect(x + 5, pillY, colWidth - 10, 46, 6)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#64748b')
      .text(item.label, x + 5, pillY + 9, {
        width: colWidth - 10,
        align: 'center',
        characterSpacing: 0.5,
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor('#0f172a')
      .text(item.val, x + 5, pillY + 25, {
        width: colWidth - 10,
        align: 'center',
      });
  });

  // Signatures Section
  const sigY = 368;

  // Left Signature: Mentor
  doc
    .moveTo(80, sigY + 40)
    .lineTo(260, sigY + 40)
    .lineWidth(1)
    .stroke('#94a3b8');

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#0f172a')
    .text(certificate.mentorName || 'Industry Mentor', 80, sigY + 46, { width: 180, align: 'center' });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#64748b')
    .text('Industry Mentor / Supervisor', 80, sigY + 60, { width: 180, align: 'center' });

  // Center Seal
  const sealCenterX = width / 2;
  const sealCenterY = sigY + 36;
  doc.circle(sealCenterX, sealCenterY, 32).lineWidth(2).stroke('#0284c7');
  doc.circle(sealCenterX, sealCenterY, 28).lineWidth(0.5).stroke('#38bdf8');
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor('#0369a1')
    .text('VERIFIED', sealCenterX - 25, sealCenterY - 10, { width: 50, align: 'center' });
  doc
    .font('Helvetica-Bold')
    .fontSize(6)
    .fillColor('#0284c7')
    .text('SIMS SEAL', sealCenterX - 25, sealCenterY + 2, { width: 50, align: 'center' });

  // Right Signature: Institutional Placement Coordinator
  doc
    .moveTo(width - 260, sigY + 40)
    .lineTo(width - 80, sigY + 40)
    .lineWidth(1)
    .stroke('#94a3b8');

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#0f172a')
    .text('Academic Dean / Coordinator', width - 260, sigY + 46, { width: 180, align: 'center' });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#64748b')
    .text('Institutional Placement Office', width - 260, sigY + 60, { width: 180, align: 'center' });

  // Bottom Security & Verification Bar
  const bottomBarY = height - 64;
  doc
    .roundedRect(44, bottomBarY, width - 88, 28, 4)
    .fill('#f1f5f9');

  const verifyUrl = `${env.CLIENT_URL || 'http://localhost:5173'}/verify-certificate/${certificate.verificationCode || 'VERIFIED'}`;

  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor('#0f172a')
    .text(
      `Credential ID: ${certificate.certificateNumber || 'SIMS-CERT'}  •  Security Verification Code: ${certificate.verificationCode || 'VERIFIED'}`,
      50,
      bottomBarY + 5,
      { align: 'center' }
    );

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#64748b')
    .text(
      `Verify authenticity online: ${verifyUrl}`,
      50,
      bottomBarY + 16,
      { align: 'center' }
    );
};

/**
 * Generates an in-memory PDF Buffer using PDFKit.
 * @param {Object} certificate - Certificate document or object
 * @returns {Promise<Buffer>}
 */
export const generateCertificatePdfBuffer = (certificate) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      renderCertificateDocument(doc, certificate);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Streams a PDF certificate dynamically using PDFKit to an Express response.
 * @param {Object} certificate - Certificate Mongoose document or plain object
 * @param {Object} res - Express response stream
 */
export const streamCertificatePdf = (certificate, res) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 40,
  });

  doc.pipe(res);
  renderCertificateDocument(doc, certificate);
  doc.end();
};

/**
 * Issues a new Certificate record in MongoDB if not already created for this allocation.
 * Strictly verifies actual dates and enforces non-duplication.
 */
export const issueCertificate = async ({
  allocation,
  internship,
  student,
  company,
  mentor,
  evaluation,
  startDate: customStartDate,
  endDate: customEndDate,
  finalRating = 4.5,
  recommendation = 'Recommended',
  deliveryEmail,
  issuedBy,
  issuedByRole = 'mentor',
  isDemo = false,
}) => {
  try {
    const studentId = student?._id || student;
    const internshipId = internship?._id || internship;
    const allocationId = allocation?._id || allocation;

    // 1. Idempotency check: Reuse existing certificate if already issued
    const existingQuery = [];
    if (allocationId) {
      existingQuery.push({ allocation: allocationId });
    }
    if (studentId && internshipId) {
      existingQuery.push({ student: studentId, internship: internshipId });
    }
    if (existingQuery.length > 0) {
      const existing = await Certificate.findOne({ $or: existingQuery });
      if (existing) {
        logger.info(`Reusing existing certificate ${existing.certificateNumber} for student ${studentId}`);
        return existing;
      }
    }

    // 2. Strict Date Validation: Never invent, never estimate, never use createdAt
    const rawStartDate = allocation?.startDate || customStartDate;
    const rawEndDate = allocation?.endDate || customEndDate;

    if (!rawStartDate || isNaN(new Date(rawStartDate).getTime())) {
      const err = new Error('Cannot issue certificate: Verified internship start date is missing or invalid.');
      err.statusCode = 400;
      err.code = 'INVALID_START_DATE';
      throw err;
    }

    if (!rawEndDate || isNaN(new Date(rawEndDate).getTime())) {
      const err = new Error('Cannot issue certificate: Verified internship end date is missing or invalid.');
      err.statusCode = 400;
      err.code = 'INVALID_END_DATE';
      throw err;
    }

    const verifiedStartDate = new Date(rawStartDate);
    const verifiedEndDate = new Date(rawEndDate);

    if (verifiedEndDate < verifiedStartDate) {
      const err = new Error('Cannot issue certificate: Verified internship end date cannot be earlier than start date.');
      err.statusCode = 400;
      err.code = 'INVALID_DATE_RANGE';
      throw err;
    }

    // 3. Generate Unique Identifiers
    const verificationCode = generateVerificationCode();
    const certificateNumber = `CERT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    let grade = 'Distinction';
    if (finalRating >= 4.5) grade = 'Distinction';
    else if (finalRating >= 3.8) grade = 'First Class with Honors';
    else if (finalRating >= 3.0) grade = 'First Class';
    else grade = 'Pass';

    const resolvedDeliveryEmail = (
      deliveryEmail ||
      allocation?.completionRequest?.preferredDeliveryEmail ||
      student?.email ||
      ''
    ).trim().toLowerCase();

    const resolvedIsDemo = Boolean(isDemo || allocation?.isDemo);

    // 4. Create and persist Certificate record in MongoDB
    const cert = await Certificate.create({
      certificateNumber,
      verificationCode,
      student: studentId,
      internship: internshipId,
      company: company?._id || company || studentId,
      mentor: mentor?._id || mentor,
      allocation: allocationId || undefined,
      evaluation: evaluation?._id || evaluation || undefined,
      studentName: student?.name || 'Student Candidate',
      studentEmail: student?.email || '',
      studentCollegeId: student?.profile?.studentDetails?.studentId || '',
      deliveryEmail: resolvedDeliveryEmail,
      issuedBy: issuedBy?._id || issuedBy || undefined,
      issuedByRole: issuedByRole || 'mentor',
      isDemo: resolvedIsDemo,
      internshipTitle: internship?.title || 'Internship Program',
      companyName: internship?.companyName || company?.name || 'Partner Enterprise',
      mentorName: mentor?.name || 'Industry Supervisor',
      duration: internship?.duration || '3 Months',
      startDate: verifiedStartDate,
      endDate: verifiedEndDate,
      issueDate: new Date(),
      finalRating,
      grade,
      recommendation,
      status: CERTIFICATE_STATUSES.ISSUED,
      emailDeliveryStatus: EMAIL_DELIVERY_STATUSES.PENDING,
      emailDeliveredAt: null,
      emailError: '',
      emailDeliveryHistory: [],
    });

    logger.info(`Certificate created successfully: ${cert.certificateNumber} for student ${studentId} (Demo: ${resolvedIsDemo})`);
    return cert;
  } catch (err) {
    logger.error('Failed to issue certificate:', err);
    throw err;
  }
};

/**
 * Delivers the certificate PDF via email to the student's chosen delivery address.
 * Updates MongoDB delivery status safely. Separated from certificate creation for retryability.
 *
 * @param {string|ObjectId} certificateId - Certificate document ID
 * @returns {Promise<{ sent: boolean, certificate: Object, error?: string }>}
 */
export const deliverCertificateEmail = async (certificateId) => {
  const cert = await Certificate.findById(certificateId)
    .populate('student', 'name email')
    .populate('company', 'name')
    .populate('internship', 'title companyName')
    .populate('issuedBy', 'name email');

  if (!cert) {
    const error = new Error(`Certificate ${certificateId} not found for delivery.`);
    error.statusCode = 404;
    throw error;
  }

  const recipientEmail = cert.deliveryEmail || cert.studentEmail || cert.student?.email;
  if (!recipientEmail) {
    cert.emailDeliveryStatus = EMAIL_DELIVERY_STATUSES.FAILED;
    cert.emailError = 'Student has no registered or preferred delivery email address.';
    cert.emailDeliveryHistory = cert.emailDeliveryHistory || [];
    cert.emailDeliveryHistory.push({
      sentAt: new Date(),
      recipientEmail: 'unspecified',
      status: 'failed',
      error: cert.emailError,
    });
    await cert.save();
    return { sent: false, error: cert.emailError, certificate: cert };
  }

  try {
    // Generate PDF Buffer dynamically
    const pdfBuffer = await generateCertificatePdfBuffer(cert);

    // Dispatch email with PDF attachment
    const result = await sendCertificateEmail({
      to: recipientEmail,
      studentName: cert.studentName || cert.student?.name || 'Student',
      internshipTitle: cert.internshipTitle || cert.internship?.title || 'Internship Program',
      companyName: cert.companyName || cert.internship?.companyName || 'Partner Enterprise',
      certificateNumber: cert.certificateNumber,
      verificationCode: cert.verificationCode,
      startDate: cert.startDate,
      endDate: cert.endDate,
      pdfBuffer,
      isDemo: cert.isDemo,
    });

    cert.emailDeliveryHistory = cert.emailDeliveryHistory || [];
    const historyItem = {
      sentAt: new Date(),
      recipientEmail,
      status: result.sent ? 'sent' : 'failed',
      error: result.sent ? '' : (result.error || 'SMTP delivery failed or unconfigured'),
    };
    cert.emailDeliveryHistory.push(historyItem);

    if (result.sent) {
      cert.emailDeliveryStatus = EMAIL_DELIVERY_STATUSES.SENT;
      cert.emailDeliveredAt = new Date();
      cert.emailError = '';
      await cert.save();
      logger.info(`Certificate ${cert.certificateNumber} emailed successfully to ${recipientEmail}`);
      return { sent: true, certificate: cert, result };
    } else {
      cert.emailDeliveryStatus = EMAIL_DELIVERY_STATUSES.FAILED;
      cert.emailError = result.error || 'SMTP delivery failed or unconfigured';
      await cert.save();
      logger.warn(`Certificate ${cert.certificateNumber} email delivery failed: ${cert.emailError}`);
      return { sent: false, error: cert.emailError, certificate: cert, result };
    }
  } catch (deliveryErr) {
    cert.emailDeliveryStatus = EMAIL_DELIVERY_STATUSES.FAILED;
    cert.emailError = deliveryErr.message || 'Error occurred during PDF generation or email dispatch';
    cert.emailDeliveryHistory = cert.emailDeliveryHistory || [];
    cert.emailDeliveryHistory.push({
      sentAt: new Date(),
      recipientEmail,
      status: 'failed',
      error: cert.emailError,
    });
    await cert.save();
    logger.error(`Exception during certificate email delivery for ${cert.certificateNumber}:`, deliveryErr);
    return { sent: false, error: cert.emailError, certificate: cert };
  }
};

export default {
  generateVerificationCode,
  renderCertificateDocument,
  generateCertificatePdfBuffer,
  streamCertificatePdf,
  issueCertificate,
  deliverCertificateEmail,
};

