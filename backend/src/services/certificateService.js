import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { Certificate, CERTIFICATE_STATUSES } from '../models/Certificate.js';
import { logger } from '../utils/logger.js';

/**
 * Generates a unique, tamper-evident verification code.
 */
export const generateVerificationCode = () => {
  return `SIMS-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * Issues a new Certificate record in MongoDB if not already created for this allocation.
 */
export const issueCertificate = async ({
  allocation,
  internship,
  student,
  company,
  mentor,
  evaluation,
  finalRating = 4.5,
  recommendation = 'Recommended',
}) => {
  try {
    // Check if certificate already exists for this student and internship
    const existing = await Certificate.findOne({
      student: student._id || student,
      internship: internship._id || internship,
    });

    if (existing) {
      return existing;
    }

    const verificationCode = generateVerificationCode();
    const certificateNumber = `CERT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    let grade = 'Distinction';
    if (finalRating >= 4.5) grade = 'Distinction';
    else if (finalRating >= 3.8) grade = 'First Class with Honors';
    else if (finalRating >= 3.0) grade = 'First Class';
    else grade = 'Pass';

    const cert = await Certificate.create({
      certificateNumber,
      verificationCode,
      student: student._id || student,
      internship: internship._id || internship,
      company: company?._id || company || student._id,
      mentor: mentor?._id || mentor,
      allocation: allocation?._id || allocation,
      evaluation: evaluation?._id || evaluation,
      studentName: student.name || 'Student Candidate',
      studentEmail: student.email || '',
      studentCollegeId: student.profile?.studentDetails?.studentId || '',
      internshipTitle: internship.title || 'Internship Program',
      companyName: internship.companyName || company?.name || 'Partner Enterprise',
      mentorName: mentor?.name || 'Industry Supervisor',
      duration: internship.duration || '3 Months',
      startDate: allocation?.startDate,
      endDate: allocation?.endDate,
      issueDate: new Date(),
      finalRating,
      grade,
      recommendation,
      status: CERTIFICATE_STATUSES.ISSUED,
    });

    return cert;
  } catch (err) {
    logger.error('Failed to issue certificate:', err);
    throw err;
  }
};

/**
 * Streams a PDF certificate dynamically using PDFKit.
 * @param {Object} certificate - Certificate Mongoose document or plain object
 * @param {Object} res - Express response stream
 */
export const streamCertificatePdf = (certificate, res) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 40,
  });

  // Pipe directly to HTTP response
  doc.pipe(res);

  const width = doc.page.width;
  const height = doc.page.height;

  // Background gradient-like fills
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
    .text(certificate.studentName || 'Student Name', 0, 140, {
      align: 'center',
    });

  // Decorative line under student name
  const nameLineWidth = 240;
  doc
    .moveTo((width - nameLineWidth) / 2, 175)
    .lineTo((width + nameLineWidth) / 2, 175)
    .lineWidth(1.5)
    .stroke('#0284c7');

  // Context Paragraph
  const collegeIdText = certificate.studentCollegeId ? `(ID: ${certificate.studentCollegeId})` : '';
  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#334155')
    .text(
      `has actively and successfully fulfilled all academic milestones, practical competencies, and workplace assignments for the position of`,
      60,
      192,
      {
        align: 'center',
        width: width - 120,
        lineGap: 4,
      }
    );

  // Position & Company
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#0f172a')
    .text(`"${certificate.internshipTitle}"`, 0, 222, {
      align: 'center',
    });

  doc
    .font('Helvetica')
    .fontSize(13)
    .fillColor('#475569')
    .text(`hosted and supervised at ${certificate.companyName}`, 0, 246, {
      align: 'center',
    });

  // Details Pill Grid
  const pillY = 280;
  const ratingText = certificate.finalRating ? `${certificate.finalRating.toFixed(1)} / 5.0` : '4.8 / 5.0';
  const gradeText = certificate.grade || 'Distinction';
  const durationText = certificate.duration || '3 Months';
  const issueDateText = new Date(certificate.issueDate || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const details = [
    { label: 'PROGRAM DURATION', val: durationText },
    { label: 'PERFORMANCE SCORE', val: ratingText },
    { label: 'EVALUATION GRADE', val: gradeText },
    { label: 'DATE OF ISSUANCE', val: issueDateText },
  ];

  const colWidth = (width - 120) / 4;
  details.forEach((item, index) => {
    const x = 60 + index * colWidth;
    doc
      .roundedRect(x + 5, pillY, colWidth - 10, 44, 6)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#64748b')
      .text(item.label, x + 5, pillY + 8, {
        width: colWidth - 10,
        align: 'center',
        characterSpacing: 0.5,
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#0f172a')
      .text(item.val, x + 5, pillY + 24, {
        width: colWidth - 10,
        align: 'center',
      });
  });

  // Signatures Section
  const sigY = 370;

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

  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor('#0f172a')
    .text(
      `Credential Number: ${certificate.certificateNumber || 'SIMS-CERT'}  •  Security Verification Code: ${certificate.verificationCode || 'VERIFIED'}`,
      50,
      bottomBarY + 5,
      { align: 'center' }
    );

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor('#64748b')
    .text(
      'To verify authenticity, visit platform verification portal or scan official institution transcript.',
      50,
      bottomBarY + 16,
      { align: 'center' }
    );

  doc.end();
};

