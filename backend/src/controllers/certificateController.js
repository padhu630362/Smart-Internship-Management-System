import { Certificate, CERTIFICATE_STATUSES } from '../models/Certificate.js';
import { streamCertificatePdf } from '../services/certificateService.js';
import { ROLES } from '../models/User.js';
import { logger } from '../utils/logger.js';

/**
 * Student retrieves their earned certificates of completion.
 */
export const getMyCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({
      student: req.user.id,
      status: CERTIFICATE_STATUSES.ISSUED,
    }).sort({ issueDate: -1 });

    res.status(200).json({
      success: true,
      data: { certificates },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve a specific certificate by its MongoDB ID.
 */
export const getCertificateById = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student', 'name email profile')
      .populate('internship', 'title companyName duration')
      .populate('company', 'name email');

    if (!certificate) {
      const error = new Error('Certificate not found.');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    // Role verification
    if (
      req.user.role === ROLES.STUDENT &&
      certificate.student._id.toString() !== req.user.id
    ) {
      const error = new Error('You do not have permission to view this certificate.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: { certificate },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Dynamically streams the certificate PDF document for browser viewing or download.
 */
export const downloadCertificatePdf = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      const error = new Error('Certificate document not found.');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    // Role verification
    if (
      req.user.role === ROLES.STUDENT &&
      certificate.student.toString() !== req.user.id
    ) {
      const error = new Error('Unauthorized to access this certificate document.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    const filename = `Certificate-${certificate.certificateNumber || 'SIMS'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);

    streamCertificatePdf(certificate, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Public endpoint to verify credential authenticity via verification code.
 */
export const verifyCertificate = async (req, res, next) => {
  try {
    const code = req.params.code?.trim().toUpperCase();

    if (!code) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'A verification code is required.',
      });
    }

    const certificate = await Certificate.findOne({
      $or: [
        { verificationCode: code },
        { certificateNumber: code },
      ],
    });

    if (!certificate) {
      return res.status(404).json({
        success: true,
        valid: false,
        message: 'No matching certificate credential was found in institutional records.',
      });
    }

    if (certificate.status === CERTIFICATE_STATUSES.REVOKED) {
      return res.status(200).json({
        success: true,
        valid: false,
        status: 'revoked',
        message: 'This certificate has been revoked by the issuing institution.',
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      data: {
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode,
        studentName: certificate.studentName,
        internshipTitle: certificate.internshipTitle,
        companyName: certificate.companyName,
        mentorName: certificate.mentorName,
        duration: certificate.duration,
        issueDate: certificate.issueDate,
        finalRating: certificate.finalRating,
        grade: certificate.grade,
        status: certificate.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

