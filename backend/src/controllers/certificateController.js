import { Certificate, CERTIFICATE_STATUSES } from '../models/Certificate.js';
import { Allocation, ALLOCATION_STATUSES } from '../models/Allocation.js';
import { User, ROLES } from '../models/User.js';
import {
  streamCertificatePdf,
  issueCertificate,
  deliverCertificateEmail,
} from '../services/certificateService.js';
import {
  createAndDispatchNotification,
  NOTIFICATION_TYPES,
} from '../services/notificationService.js';
import { escapeRegex } from '../middlewares/sanitize.js';
import { seedDemoScenario } from '../../scripts/seed_demo.mjs';
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
 * Retrieve certificate preview data before issuance
 */
export const getCertificatePreview = async (req, res, next) => {
  try {
    const { allocationId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

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

    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;
    const isAssignedMentor = allocation.mentor && allocation.mentor._id.toString() === userId;
    const isHostCompany = allocation.company && allocation.company._id.toString() === userId;
    const isDemoForMentor = userRole === ROLES.MENTOR && Boolean(allocation.isDemo);

    if (!isPrivileged && !isAssignedMentor && !isHostCompany && !isDemoForMentor) {
      const error = new Error('You are not authorized to preview certificates for this allocation.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    const preferredEmail =
      allocation.completionRequest?.preferredDeliveryEmail || allocation.student?.email || '';

    // Check if an existing certificate was already issued
    const existingCertificate = await Certificate.findOne({
      allocation: allocation._id,
      status: CERTIFICATE_STATUSES.ISSUED,
    });

    res.status(200).json({
      success: true,
      data: {
        allocationId: allocation._id,
        studentId: allocation.student?._id,
        studentName: allocation.student?.name || 'Student Intern',
        studentEmail: allocation.student?.email || '',
        preferredDeliveryEmail: preferredEmail,
        internshipTitle: allocation.internship?.title || 'Internship Program',
        companyName: allocation.company?.name || allocation.internship?.companyName || 'Host Organization',
        mentorName: allocation.mentor?.name || 'Assigned Mentor',
        startDate: allocation.startDate,
        endDate: allocation.endDate,
        duration: allocation.internship?.duration || 'Course Duration',
        isDemo: Boolean(allocation.isDemo),
        completionStatus: allocation.completionRequest?.status || 'none',
        studentNotes: allocation.completionRequest?.studentNotes || '',
        alreadyIssued: Boolean(existingCertificate),
        existingCertificate: existingCertificate || null,
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
    const { deliveryEmail } = req.body;

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
    const isDemoForMentor = userRole === ROLES.MENTOR && Boolean(allocation.isDemo);

    if (!isPrivileged && !isAssignedMentor && !isHostCompany) {
      if (isDemoForMentor) {
        allocation.mentor = req.user.id;
        await allocation.save();
      } else {
        const error = new Error('You are not authorized to issue a certificate for this allocation.');
        error.statusCode = 403;
        error.code = 'FORBIDDEN';
        return next(error);
      }
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

    // Determine target delivery email
    const targetEmail = (
      deliveryEmail ||
      allocation.completionRequest?.preferredDeliveryEmail ||
      allocation.student?.email ||
      ''
    ).trim().toLowerCase();

    // Issue certificate record
    const certificate = await issueCertificate({
      allocation,
      internship: allocation.internship,
      student: allocation.student,
      company: allocation.company,
      mentor: allocation.mentor,
      startDate: allocation.startDate,
      endDate: allocation.endDate,
      deliveryEmail: targetEmail,
      issuedBy: req.user.id,
      issuedByRole: req.user.role,
      isDemo: Boolean(allocation.isDemo),
    });

    // Mark allocation completed and completionRequest approved if not already
    let updatedAllocation = false;
    if (allocation.status !== ALLOCATION_STATUSES.COMPLETED) {
      allocation.status = ALLOCATION_STATUSES.COMPLETED;
      allocation.statusHistory.push({
        status: ALLOCATION_STATUSES.COMPLETED,
        changedBy: req.user.id,
        changedByName: req.user.name,
        changedAt: new Date(),
        note: `Internship completion approved and official certificate (${certificate.certificateNumber}) issued.`,
      });
      updatedAllocation = true;
    }

    if (allocation.completionRequest?.status !== 'approved') {
      allocation.completionRequest.status = 'approved';
      allocation.completionRequest.reviewedAt = new Date();
      allocation.completionRequest.reviewedBy = req.user.id;
      allocation.completionRequest.feedback = 'Completion approved and certificate generated.';
      updatedAllocation = true;
    }

    if (updatedAllocation) {
      await allocation.save();
    }

    // Deliver email safely
    const emailDelivery = await deliverCertificateEmail(certificate._id);

    // Notify student of certificate issuance
    createAndDispatchNotification({
      recipientId: allocation.student._id,
      senderId: req.user.id,
      type: NOTIFICATION_TYPES.CERTIFICATE_ISSUED,
      title: 'Completion Certificate Issued!',
      message: `Congratulations! Your internship completion certificate for "${allocation.internship?.title || 'Internship'}" has been officially issued!`,
      link: '/certificates',
      eventKey: `cert_issued:${certificate._id}`,
      metadata: {
        certificateId: certificate._id,
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode,
        deliveryEmail: targetEmail,
      },
    }).catch(() => {});

    // If email failed, dispatch notification to issuer
    if (!emailDelivery.sent) {
      createAndDispatchNotification({
        recipientId: req.user.id,
        senderId: req.user.id,
        type: NOTIFICATION_TYPES.CERTIFICATE_EMAIL_FAILED,
        title: 'Certificate Email Delivery Issue',
        message: `Certificate ${certificate.certificateNumber} was issued, but automated email delivery to ${targetEmail} failed. You can retry sending from the audit dashboard.`,
        link: '/allocations',
        eventKey: `cert_email_fail:${certificate._id}`,
        metadata: {
          certificateId: certificate._id,
          deliveryEmail: targetEmail,
          error: emailDelivery.error,
        },
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'Certificate issued successfully.',
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

/**
 * Admin Certificate Audit Dashboard — Summary Metrics & Filterable Audit Logs
 */
export const getAdminCertificateAudit = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const {
      search,
      status,
      emailStatus,
      mentorId,
      type = 'all',
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    // Filter by Real vs Demo
    if (type === 'real') {
      filter.isDemo = { $ne: true };
    } else if (type === 'demo') {
      filter.isDemo = true;
    }

    // Filter by status
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Filter by email delivery status
    if (emailStatus && emailStatus !== 'all') {
      filter.emailDeliveryStatus = emailStatus;
    }

    // Filter by mentor
    if (mentorId && mentorId !== 'all') {
      filter.$or = [{ mentor: mentorId }, { issuedBy: mentorId }];
    }

    // Filter by date range on issueDate
    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) {
        filter.issueDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.issueDate.$lte = end;
      }
    }

    // Text search
    if (search && search.trim()) {
      const safeRegex = new RegExp(escapeRegex(search.trim()), 'i');
      const searchCriteria = [
        { certificateNumber: safeRegex },
        { verificationCode: safeRegex },
        { studentName: safeRegex },
        { studentEmail: safeRegex },
        { deliveryEmail: safeRegex },
        { internshipTitle: safeRegex },
        { companyName: safeRegex },
        { mentorName: safeRegex },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchCriteria }];
        delete filter.$or;
      } else {
        filter.$or = searchCriteria;
      }
    }

    // Parallel fetch: Paginated Certificates & Aggregated Summary KPIs
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      certificates,
      totalMatching,
      totalCertificates,
      issuedThisMonth,
      uniqueStudents,
      uniqueMentors,
      pendingCompletionRequests,
      failedEmailDeliveries,
      demoCertificatesCount,
      realCertificatesCount,
    ] = await Promise.all([
      Certificate.find(filter)
        .populate('issuedBy', 'name email role')
        .populate('student', 'name email profile')
        .populate('mentor', 'name email profile')
        .populate('company', 'name email profile')
        .populate('allocation', 'startDate endDate status isDemo')
        .sort({ issueDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Certificate.countDocuments(filter),
      Certificate.countDocuments({ status: CERTIFICATE_STATUSES.ISSUED }),
      Certificate.countDocuments({
        status: CERTIFICATE_STATUSES.ISSUED,
        issueDate: { $gte: startOfMonth },
      }),
      Certificate.distinct('student', { status: CERTIFICATE_STATUSES.ISSUED }),
      Certificate.distinct('mentor', { status: CERTIFICATE_STATUSES.ISSUED }),
      Allocation.countDocuments({ 'completionRequest.status': 'pending' }),
      Certificate.countDocuments({ emailDeliveryStatus: 'failed' }),
      Certificate.countDocuments({ isDemo: true }),
      Certificate.countDocuments({ isDemo: { $ne: true } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCertificates,
          issuedThisMonth,
          totalStudentsCertified: uniqueStudents.length,
          totalMentorsIssued: uniqueMentors.length,
          pendingCompletionRequests,
          failedEmailDeliveries,
          demoCertificatesCount,
          realCertificatesCount,
        },
        certificates,
        pagination: {
          total: totalMatching,
          page,
          limit,
          totalPages: Math.ceil(totalMatching / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin Mentor Issuance Statistics
 */
export const getAdminMentorIssuanceStats = async (req, res, next) => {
  try {
    const { type = 'all' } = req.query;

    const certMatch = { status: CERTIFICATE_STATUSES.ISSUED };
    if (type === 'real') {
      certMatch.isDemo = { $ne: true };
    } else if (type === 'demo') {
      certMatch.isDemo = true;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Find all users who are mentors
    const mentors = await User.find({ role: ROLES.MENTOR }).select('name email profile');

    // Aggregate certificate counts per mentor
    const statsPromises = mentors.map(async (mentor) => {
      const mentorId = mentor._id;

      const [totalIssued, issuedThisMonth, pendingRequests, failedEmails] = await Promise.all([
        Certificate.countDocuments({
          ...certMatch,
          $or: [{ mentor: mentorId }, { issuedBy: mentorId }],
        }),
        Certificate.countDocuments({
          ...certMatch,
          $or: [{ mentor: mentorId }, { issuedBy: mentorId }],
          issueDate: { $gte: startOfMonth },
        }),
        Allocation.countDocuments({
          mentor: mentorId,
          'completionRequest.status': 'pending',
        }),
        Certificate.countDocuments({
          $or: [{ mentor: mentorId }, { issuedBy: mentorId }],
          emailDeliveryStatus: 'failed',
        }),
      ]);

      return {
        mentorId: mentor._id,
        mentorName: mentor.name,
        mentorEmail: mentor.email,
        department: mentor.profile?.department || 'Engineering',
        totalIssued,
        issuedThisMonth,
        pendingCompletionRequests: pendingRequests,
        failedEmailDeliveries: failedEmails,
      };
    });

    const mentorStats = await Promise.all(statsPromises);
    // Sort mentors with most certificates first
    mentorStats.sort((a, b) => b.totalIssued - a.totalIssued);

    res.status(200).json({
      success: true,
      data: {
        mentors: mentorStats,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Administrative Seed Demo Endpoint
 */
export const seedDemoAdminEndpoint = async (req, res, next) => {
  try {
    const { stage } = req.body;
    const result = await seedDemoScenario({ stage: stage || 'default' });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};


