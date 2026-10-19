import { Certificate, CERTIFICATE_STATUSES } from '../models/Certificate.js';
import { Allocation } from '../models/Allocation.js';
import {
  streamCertificatePdf,
  issueCertificate,
  deliverCertificateEmail,
} from '../services/certificateService.js';
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
 * Omits private student information (such as email, ID, phone).
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
        startDate: certificate.startDate,
        endDate: certificate.endDate,
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

/**
 * Authorized mentor, coordinator, or admin issues a certificate for an allocation.
 */
export const issueAllocationCertificate = async (req, res, next) => {
  try {
    const { allocationId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === ROLES.STUDENT) {
      const error = new Error('Access denied: Students are not authorized to issue certificates.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    const allocation = await Allocation.findById(allocationId)
      .populate('student', 'name email profile')
      .populate('internship', 'title companyName duration')
      .populate('company', 'name email profile')
      .populate('mentor', 'name email profile');

    if (!allocation) {
      const error = new Error('Internship allocation not found.');
      error.statusCode = 404;
      error.code = 'ALLOCATION_NOT_FOUND';
      return next(error);
    }

    // Role check
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;
    const isAssignedMentor = allocation.mentor && allocation.mentor._id.toString() === userId;
    const isHostCompany = allocation.company && allocation.company._id.toString() === userId;

    if (!isPrivileged && !isAssignedMentor && !isHostCompany) {
      const error = new Error('You are not authorized to issue a certificate for this allocation.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    // Strict Date Validation
    if (!allocation.startDate || isNaN(new Date(allocation.startDate).getTime())) {
      const error = new Error('Cannot issue certificate: Verified internship start date is missing or invalid.');
      error.statusCode = 400;
      error.code = 'INVALID_START_DATE';
      return next(error);
    }

    if (!allocation.endDate || isNaN(new Date(allocation.endDate).getTime())) {
      const error = new Error('Cannot issue certificate: Verified internship end date is missing or invalid.');
      error.statusCode = 400;
      error.code = 'INVALID_END_DATE';
      return next(error);
    }

    if (new Date(allocation.endDate) < new Date(allocation.startDate)) {
      const error = new Error('Cannot issue certificate: Verified internship end date cannot be earlier than start date.');
      error.statusCode = 400;
      error.code = 'INVALID_DATE_RANGE';
      return next(error);
    }

    const certificate = await issueCertificate({
      allocation,
      internship: allocation.internship,
      student: allocation.student,
      company: allocation.company,
      mentor: allocation.mentor,
      startDate: allocation.startDate,
      endDate: allocation.endDate,
    });

    const emailDelivery = await deliverCertificateEmail(certificate._id);

    res.status(200).json({
      success: true,
      message: 'Certificate processed successfully.',
      data: {
        certificate,
        emailDelivery,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Explicit authorized endpoint to resend a certificate email.
 */
export const resendCertificateEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === ROLES.STUDENT) {
      const error = new Error('Access denied: Students are not authorized to resend certificates.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      const error = new Error('Certificate not found.');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;
    const isAssignedMentor = certificate.mentor && certificate.mentor.toString() === userId;
    const isHostCompany = certificate.company && certificate.company.toString() === userId;

    if (!isPrivileged && !isAssignedMentor && !isHostCompany) {
      const error = new Error('You are not authorized to resend email for this certificate.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    const emailDelivery = await deliverCertificateEmail(certificate._id);

    res.status(200).json({
      success: true,
      message: emailDelivery.sent
        ? 'Certificate email resent successfully.'
        : 'Certificate email delivery attempt failed.',
      data: {
        certificate: emailDelivery.certificate || certificate,
        emailDelivery,
      },
    });
  } catch (err) {
    next(err);
  }
};

