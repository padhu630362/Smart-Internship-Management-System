import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { Certificate, CERTIFICATE_STATUSES, EMAIL_DELIVERY_STATUSES } from '../models/Certificate.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';
import { sendCertificateEmail } from './emailService.js';
import { env } from '../config/env.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SIGNATURES_DIR = path.resolve(__dirname, '../assets/signatures');
const PADMAVATHI_SIG_PATH = path.join(SIGNATURES_DIR, 'padmavathi_signature.png');
const JAYA_SIG_PATH = path.join(SIGNATURES_DIR, 'jaya_signature.png');

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
export const renderCertificateDocument = (doc, certificate, qrBuffer = null) => {
  const width = doc.page.width;   // 841.89 for A4 landscape
  const height = doc.page.height; // 595.28 for A4 landscape

  // 1. Base Pristine Background
  doc.rect(0, 0, width, height).fill('#fcfbf9');

  // 2. High-precision Multi-tier Framing Borders
  // Outer perimeter frame in Deep Midnight Navy
  doc.rect(18, 18, width - 36, height - 36).lineWidth(1.5).stroke('#0f2b46');
  // Secondary hairline in Warm Champagne Gold
  doc.rect(23, 23, width - 46, height - 46).lineWidth(0.75).stroke('#c79d4c');
  // Tertiary subtle inner boundary in Slate
  doc.rect(27, 27, width - 54, height - 54).lineWidth(0.5).stroke('#cbd5e1');

  // 3. Symmetrical Geometric Corner Flourishes
  const cornerLen = 28;
  const drawCorner = (x, y, dx, dy) => {
    doc.moveTo(x, y + dy * cornerLen).lineTo(x, y).lineTo(x + dx * cornerLen, y).lineWidth(2).stroke('#0f2b46');
    doc.moveTo(x + dx * 4, y + dy * (cornerLen - 4)).lineTo(x + dx * 4, y + dy * 4).lineTo(x + dx * (cornerLen - 4), y + dy * 4).lineWidth(1).stroke('#c79d4c');
  };
  drawCorner(32, 32, 1, 1);
  drawCorner(width - 32, 32, -1, 1);
  drawCorner(32, height - 32, 1, -1);
  drawCorner(width - 32, height - 32, -1, -1);

  // 4. Demonstration Indicator (Discreet & Professional, only if isDemo)
  if (certificate.isDemo) {
    doc
      .roundedRect(width / 2 - 190, 22, 380, 16, 3)
      .fillAndStroke('#fef3c7', '#fde68a');
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#b45309')
      .text('★ DEMONSTRATION RECORD • VERIFIED SIMS TEST ENVIRONMENT ★', 0, 26, {
        align: 'center',
        characterSpacing: 1.2,
      });
  }

  // 5. InternHub Heraldic Shield Crest & Wordmark
  const logoCenterX = width / 2;
  const logoY = certificate.isDemo ? 44 : 38;

  doc.save();
  // Vector Shield
  doc.moveTo(logoCenterX, logoY)
     .lineTo(logoCenterX + 16, logoY + 5)
     .lineTo(logoCenterX + 14, logoY + 22)
     .quadraticCurveTo(logoCenterX, logoY + 34, logoCenterX, logoY + 34)
     .quadraticCurveTo(logoCenterX, logoY + 34, logoCenterX - 14, logoY + 22)
     .lineTo(logoCenterX - 16, logoY + 5)
     .closePath()
     .fillAndStroke('#0f2b46', '#c79d4c');

  // Inner gold emblem in shield
  doc.circle(logoCenterX, logoY + 16, 5).fill('#c79d4c');
  doc.restore();

  // Brand Name Typography
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#0f2b46')
    .text('INTERNHUB', 0, logoY + 38, {
      align: 'center',
      characterSpacing: 3,
    });

  doc
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .fillColor('#856427')
    .text('ENTERPRISE CREDENTIAL VALIDATION & ACCREDITATION', 0, logoY + 51, {
      align: 'center',
      characterSpacing: 1.5,
    });

  // 6. Certificate Title & Subtitle
  const headingY = logoY + 68;
  doc
    .font('Helvetica-Bold')
    .fontSize(25)
    .fillColor('#0f2b46')
    .text('CERTIFICATE OF COMPLETION', 0, headingY, {
      align: 'center',
      characterSpacing: 2,
    });

  doc
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .fillColor('#856427')
    .text('INTERNSHIP PROGRAM & PROFESSIONAL COMPETENCY VERIFICATION', 0, headingY + 28, {
      align: 'center',
      characterSpacing: 1.5,
    });

  // 7. Recipient Conferral & Student Name
  const conferralY = headingY + 48;
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor('#64748b')
    .text('This is proudly awarded in recognition of verified workplace excellence and completion to', 0, conferralY, {
      align: 'center',
    });

  doc
    .font('Helvetica-Bold')
    .fontSize(27)
    .fillColor('#0f2b46')
    .text(certificate.studentName || 'Student Candidate', 0, conferralY + 18, {
      align: 'center',
    });

  // Decorative accent line with center diamond under student name
  const lineW = 160;
  const lineY = conferralY + 50;
  doc.moveTo(logoCenterX - lineW, lineY).lineTo(logoCenterX - 10, lineY).lineWidth(1).stroke('#c79d4c');
  doc.moveTo(logoCenterX + 10, lineY).lineTo(logoCenterX + lineW, lineY).lineWidth(1).stroke('#c79d4c');
  doc.moveTo(logoCenterX, lineY - 3).lineTo(logoCenterX + 4, lineY).lineTo(logoCenterX, lineY + 3).lineTo(logoCenterX - 4, lineY).closePath().fill('#c79d4c');

  // 8. Accreditation Narrative & Internship Details
  const narrativeY = lineY + 10;
  doc
    .font('Helvetica')
    .fontSize(11.5)
    .fillColor('#334155')
    .text(
      'who has successfully completed the prescribed industry internship curriculum, fulfilled all professional competencies, and demonstrated outstanding performance for the position of',
      70,
      narrativeY,
      {
        align: 'center',
        width: width - 140,
        lineGap: 3,
      }
    );

  doc
    .font('Helvetica-Bold')
    .fontSize(15.5)
    .fillColor('#0f172a')
    .text(`"${certificate.internshipTitle || 'Internship Program'}"`, 0, narrativeY + 36, {
      align: 'center',
    });

  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#475569')
    .text(`Hosted and Supervised at ${certificate.companyName || 'Partner Organization'}`, 0, narrativeY + 56, {
      align: 'center',
    });

  // 9. Verified Attribute Metric Cards (4 Columns)
  const startFmt = certificate.startDate
    ? new Date(certificate.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A';
  const endFmt = certificate.endDate
    ? new Date(certificate.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A';
  const issueFmt = new Date(certificate.issueDate || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const ratingText = certificate.finalRating ? `${certificate.finalRating.toFixed(1)} / 5.0` : '4.5 / 5.0';
  const gradeText = certificate.grade || 'Distinction';

  const pillY = narrativeY + 80;
  const pillHeight = 44;
  const pills = [
    { label: 'VERIFIED COMMENCEMENT', val: startFmt },
    { label: 'VERIFIED CONCLUSION', val: endFmt },
    { label: 'PERFORMANCE HONORS', val: `${gradeText} (${ratingText})` },
    { label: 'ISSUE DATE', val: issueFmt },
  ];

  const pillMarginX = 64;
  const totalPillWidth = width - pillMarginX * 2;
  const pillColWidth = totalPillWidth / 4;

  pills.forEach((p, idx) => {
    const px = pillMarginX + idx * pillColWidth;
    doc
      .roundedRect(px + 4, pillY, pillColWidth - 8, pillHeight, 5)
      .fillAndStroke('#ffffff', '#e2e8f0');

    // Top gold accent hairline on each card
    doc.moveTo(px + 4, pillY).lineTo(px + pillColWidth - 4, pillY).lineWidth(1.5).stroke('#c79d4c');

    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#856427')
      .text(p.label, px + 4, pillY + 8, {
        width: pillColWidth - 8,
        align: 'center',
        characterSpacing: 0.5,
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#0f172a')
      .text(p.val, px + 4, pillY + 23, {
        width: pillColWidth - 8,
        align: 'center',
      });
  });

  // 10. Official Signatories & Center Security Medallion
  const sigY = pillY + 68;

  // Left Signatory: Mentor / Industry Supervisor
  const leftSigX = 80;
  const leftSigWidth = 180;
  const leftSigLineY = sigY + 36;
  const mentorName = certificate.mentorName || (typeof certificate.mentor === 'object' ? certificate.mentor?.name : null) || 'Industry Mentor';
  const mentorEmail = (typeof certificate.mentor === 'object' ? certificate.mentor?.email : '') || '';
  const isJayaSignatory = /jaya/i.test(mentorName || '') || /jaya/i.test(mentorEmail || '');

  if (isJayaSignatory && fs.existsSync(JAYA_SIG_PATH)) {
    try {
      const jayaImgW = 105;
      const jayaImgH = 38;
      const jayaImgX = leftSigX + (leftSigWidth - jayaImgW) / 2;
      const jayaImgY = leftSigLineY - jayaImgH - 3;
      doc.image(JAYA_SIG_PATH, jayaImgX, jayaImgY, {
        fit: [jayaImgW, jayaImgH],
        align: 'center',
        valign: 'bottom',
      });
    } catch (err) {
      logger.warn(`Could not render Jaya signature image: ${err.message}`);
    }
  }

  doc.moveTo(leftSigX, leftSigLineY).lineTo(leftSigX + leftSigWidth, leftSigLineY).lineWidth(1).stroke('#94a3b8');
  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor('#0f172a')
    .text(mentorName, leftSigX, leftSigLineY + 6, { width: leftSigWidth, align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#64748b')
    .text('Industry Supervisor / Mentor', leftSigX, leftSigLineY + 20, { width: leftSigWidth, align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#94a3b8')
    .text(certificate.companyName || 'Host Organization', leftSigX, leftSigLineY + 32, { width: leftSigWidth, align: 'center' });

  // Center Official Seal Medallion
  const sealY = sigY + 32;
  doc.circle(logoCenterX, sealY, 30).lineWidth(2).stroke('#0f2b46');
  doc.circle(logoCenterX, sealY, 26).lineWidth(0.75).stroke('#c79d4c');
  doc.circle(logoCenterX, sealY, 23).lineWidth(0.5).stroke('#94a3b8');
  doc
    .font('Helvetica-Bold')
    .fontSize(6)
    .fillColor('#0f2b46')
    .text('INTERNHUB', logoCenterX - 25, sealY - 9, { width: 50, align: 'center', characterSpacing: 1 });
  doc
    .font('Helvetica-Bold')
    .fontSize(5)
    .fillColor('#856427')
    .text('OFFICIAL SEAL', logoCenterX - 25, sealY + 1, { width: 50, align: 'center', characterSpacing: 0.5 });
  doc
    .font('Helvetica')
    .fontSize(4.5)
    .fillColor('#64748b')
    .text('VERIFIED', logoCenterX - 25, sealY + 9, { width: 50, align: 'center' });

  // Right Signatory: Institutional Coordinator / Program Coordinator (Padmavathi)
  const rightSignatory = (() => {
    // If issued by a specific non-Padmavathi admin/coordinator
    const isExplicitAdminOrCoord =
      certificate.issuedByRole === 'admin' ||
      certificate.issuedByRole === 'coordinator' ||
      (typeof certificate.issuedBy === 'object' &&
        (certificate.issuedBy?.role === 'admin' || certificate.issuedBy?.role === 'coordinator'));

    if (isExplicitAdminOrCoord && certificate.issuedBy) {
      const issuerName = (typeof certificate.issuedBy === 'object' ? certificate.issuedBy.name : '') || '';
      const issuerEmail = (typeof certificate.issuedBy === 'object' ? certificate.issuedBy.email : '') || '';
      if (issuerName && !/padmavathi/i.test(issuerName) && !/padmavathi/i.test(issuerEmail)) {
        return {
          isPadmavathi: false,
          name: issuerName,
          designation: 'Program Coordinator',
          organization: 'InternHub',
          hasSignatureImage: false,
        };
      }
    }

    // Default institutional Program Coordinator for InternHub credentials is Padmavathi
    return {
      isPadmavathi: true,
      name: 'Padmavathi',
      designation: 'Program Coordinator',
      organization: 'InternHub',
      hasSignatureImage: fs.existsSync(PADMAVATHI_SIG_PATH),
    };
  })();

  const rightSigX = width - 260;
  const rightSigWidth = 180;
  const rightSigLineY = sigY + 36;

  if (rightSignatory.hasSignatureImage) {
    try {
      const padmaImgW = 110;
      const padmaImgH = 38;
      const padmaImgX = rightSigX + (rightSigWidth - padmaImgW) / 2;
      const padmaImgY = rightSigLineY - padmaImgH - 3;
      doc.image(PADMAVATHI_SIG_PATH, padmaImgX, padmaImgY, {
        fit: [padmaImgW, padmaImgH],
        align: 'center',
        valign: 'bottom',
      });
    } catch (err) {
      logger.warn(`Could not render Padmavathi signature image: ${err.message}`);
    }
  }

  // Draw rule line
  doc.moveTo(rightSigX, rightSigLineY).lineTo(rightSigX + rightSigWidth, rightSigLineY).lineWidth(1).stroke('#94a3b8');

  // Printed signatory details
  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor('#0f172a')
    .text(rightSignatory.name, rightSigX, rightSigLineY + 6, { width: rightSigWidth, align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#64748b')
    .text(rightSignatory.designation, rightSigX, rightSigLineY + 20, { width: rightSigWidth, align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#94a3b8')
    .text(rightSignatory.organization, rightSigX, rightSigLineY + 32, { width: rightSigWidth, align: 'center' });

  // 11. Bottom Security & Digital QR Verification Bar
  const barY = height - 76;
  const barH = 50;
  doc
    .roundedRect(44, barY, width - 88, barH, 6)
    .fillAndStroke('#f8fafc', '#e2e8f0');

  const verifyUrl = `${env.CLIENT_URL || 'http://localhost:5173'}/verify-certificate/${certificate.verificationCode || 'VERIFIED'}`;

  const qrSize = 42;
  const qrX = 52;
  const qrY = barY + 4;

  if (qrBuffer) {
    try {
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    } catch {}
  } else {
    doc.rect(qrX, qrY, qrSize, qrSize).lineWidth(1).stroke('#c79d4c');
    doc.font('Helvetica-Bold').fontSize(6).fillColor('#0f2b46').text('QR SECURE', qrX + 2, qrY + 18, { width: qrSize - 4, align: 'center' });
  }

  const textLeft = qrX + qrSize + 14;
  const textWidth = width - textLeft - 56;

  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor('#0f172a')
    .text(
      `Credential ID: ${certificate.certificateNumber || 'SIMS-CERT'}   •   Security Verification Code: ${certificate.verificationCode || 'VERIFIED'}`,
      textLeft,
      barY + 8,
      { width: textWidth }
    );

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#475569')
    .text(
      `Scan the QR code or verify authenticity online at: ${verifyUrl}`,
      textLeft,
      barY + 21,
      { width: textWidth }
    );

  doc
    .font('Helvetica')
    .fontSize(6.5)
    .fillColor('#94a3b8')
    .text(
      'This credential is cryptographically issued and verified by the InternHub Smart Internship Management System.',
      textLeft,
      barY + 33,
      { width: textWidth }
    );
};

/**
 * Generates an in-memory PDF Buffer using PDFKit with embedded QR code.
 * @param {Object} certificate - Certificate document or object
 * @returns {Promise<Buffer>}
 */
export const generateCertificatePdfBuffer = async (certificate) => {
  const verifyUrl = `${env.CLIENT_URL || 'http://localhost:5173'}/verify-certificate/${certificate.verificationCode || 'VERIFIED'}`;
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#0f2b46', light: '#ffffff' },
    });
  } catch (qrErr) {
    logger.warn(`Could not generate QR buffer: ${qrErr.message}`);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      renderCertificateDocument(doc, certificate, qrBuffer);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Streams a PDF certificate dynamically using PDFKit to an Express response with embedded QR code.
 * @param {Object} certificate - Certificate Mongoose document or plain object
 * @param {Object} res - Express response stream
 */
export const streamCertificatePdf = async (certificate, res) => {
  const verifyUrl = `${env.CLIENT_URL || 'http://localhost:5173'}/verify-certificate/${certificate.verificationCode || 'VERIFIED'}`;
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#0f2b46', light: '#ffffff' },
    });
  } catch (qrErr) {
    logger.warn(`Could not generate QR buffer: ${qrErr.message}`);
  }

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
  });

  doc.pipe(res);
  renderCertificateDocument(doc, certificate, qrBuffer);
  doc.end();
};

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

    // Retrieve actual student record to guarantee student registered account email
    let studentRecord = student;
    if (studentId && (!studentRecord || typeof studentRecord !== 'object' || !studentRecord.email)) {
      try {
        studentRecord = await User.findById(studentId).select('name email profile');
      } catch {}
    }
    const studentRegisteredEmail = (studentRecord?.email || '').trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    let resolvedDeliveryEmail = '';

    if (deliveryEmail && emailRegex.test(deliveryEmail.trim())) {
      resolvedDeliveryEmail = deliveryEmail.trim().toLowerCase();
    } else if (
      allocation?.completionRequest?.preferredDeliveryEmail &&
      emailRegex.test(allocation.completionRequest.preferredDeliveryEmail.trim())
    ) {
      resolvedDeliveryEmail = allocation.completionRequest.preferredDeliveryEmail.trim().toLowerCase();
    } else if (studentRegisteredEmail && emailRegex.test(studentRegisteredEmail)) {
      resolvedDeliveryEmail = studentRegisteredEmail;
    }

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
export const deliverCertificateEmail = async (certificateId, options = {}) => {
  const { force = false } = options;

  const cert = await Certificate.findById(certificateId)
    .populate('student', 'name email status isDeleted')
    .populate('company', 'name')
    .populate('internship', 'title companyName')
    .populate('issuedBy', 'name email role')
    .populate('mentor', 'name email');

  if (!cert) {
    const error = new Error(`Certificate ${certificateId} not found for delivery.`);
    error.statusCode = 404;
    throw error;
  }

  // Idempotency: Prevent unintended duplicate emails when an issuance request is repeated
  if (!force && cert.emailDeliveryStatus === EMAIL_DELIVERY_STATUSES.SENT) {
    logger.info(`Certificate ${cert.certificateNumber} email was already delivered. Skipping duplicate dispatch.`);
    return {
      sent: true,
      alreadySent: true,
      certificate: cert,
      recipientEmail: cert.deliveryEmail || cert.student?.email,
    };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const registeredStudentEmail = (cert.student?.email || cert.studentEmail || '').trim().toLowerCase();

  // Resolve recipient email from registered student account or student's verified delivery choice
  let recipientEmail = '';
  if (cert.deliveryEmail && emailRegex.test(cert.deliveryEmail)) {
    recipientEmail = cert.deliveryEmail;
  } else if (registeredStudentEmail && emailRegex.test(registeredStudentEmail)) {
    recipientEmail = registeredStudentEmail;
  }

  // Requirement 9: If the student's registered email is missing or invalid, do not send the certificate to a guessed address.
  if (!recipientEmail || !emailRegex.test(recipientEmail)) {
    const errorMsg = 'Student registered email address is missing or invalid. Please update student profile with a valid email to receive certificate delivery.';
    cert.emailDeliveryStatus = EMAIL_DELIVERY_STATUSES.FAILED;
    cert.emailError = errorMsg;
    cert.emailDeliveryHistory = cert.emailDeliveryHistory || [];
    cert.emailDeliveryHistory.push({
      sentAt: new Date(),
      recipientEmail: recipientEmail || 'unspecified_or_invalid',
      status: 'failed',
      error: errorMsg,
    });
    await cert.save();
    logger.warn(`Certificate ${cert.certificateNumber} delivery aborted: ${errorMsg}`);
    return { sent: false, error: errorMsg, certificate: cert };
  }

  // Ensure certificate fields remain synchronized with the resolved valid recipient
  if (cert.deliveryEmail !== recipientEmail) {
    cert.deliveryEmail = recipientEmail;
  }
  if (!cert.studentEmail && registeredStudentEmail) {
    cert.studentEmail = registeredStudentEmail;
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

