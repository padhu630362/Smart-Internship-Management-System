import { Application, APPLICATION_STATUSES, VALID_TRANSITIONS } from '../models/Application.js';
import { Internship, INTERNSHIP_STATUSES } from '../models/Internship.js';
import { ROLES } from '../models/User.js';

/**
 * Validates student application submission.
 */
export const validateSubmitApplication = async (req, res, next) => {
  try {
    const { internshipId, coverLetter, resumeUrl } = req.body;

    if (req.user.role !== ROLES.STUDENT) {
      const error = new Error('Only registered students can apply for internship opportunities.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_STUDENT_ONLY';
      return next(error);
    }

    if (!internshipId) {
      const error = new Error('Internship opportunity ID is required.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      return next(error);
    }

    const internship = await Internship.findById(internshipId);
    if (!internship) {
      const error = new Error('Internship opportunity not found.');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      return next(error);
    }

    // Opportunity must be published
    if (internship.status !== INTERNSHIP_STATUSES.PUBLISHED) {
      const error = new Error('This opportunity is not currently accepting applications.');
      error.statusCode = 400;
      error.code = 'OPPORTUNITY_NOT_ACCEPTING_APPLICATIONS';
      return next(error);
    }

    // Application deadline check
    const now = new Date();
    if (new Date(internship.applicationDeadline) < now) {
      const error = new Error('The application deadline for this internship opportunity has expired.');
      error.statusCode = 400;
      error.code = 'APPLICATION_DEADLINE_PASSED';
      return next(error);
    }

    // Duplicate submission check
    const existingApplication = await Application.findOne({
      internship: internshipId,
      student: req.user.id,
    });

    if (existingApplication) {
      const error = new Error(
        'You have already submitted an application for this internship opportunity.'
      );
      error.statusCode = 409;
      error.code = 'DUPLICATE_APPLICATION';
      return next(error);
    }

    // Verified resume check
    const effectiveResumeUrl = resumeUrl || req.user.profile?.studentDetails?.resumeUrl;
    if (!effectiveResumeUrl) {
      const error = new Error(
        'An official resume document is required. Please upload your resume in your Profile before applying.'
      );
      error.statusCode = 400;
      error.code = 'RESUME_REQUIRED';
      return next(error);
    }

    // Cover letter character limit
    if (coverLetter && coverLetter.length > 3000) {
      const error = new Error('Cover letter must not exceed 3000 characters.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      return next(error);
    }

    req.internship = internship;
    req.effectiveResumeUrl = effectiveResumeUrl;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Validates application status updates and controlled transition flows.
 */
export const validateStatusTransition = async (req, res, next) => {
  try {
    const { status: targetStatus, reason, decisionReason } = req.body;
    const targetApplicationId = req.params.id;

    if (!targetStatus || !Object.values(APPLICATION_STATUSES).includes(targetStatus)) {
      const error = new Error(
        `Valid target status required: ${Object.values(APPLICATION_STATUSES).join(', ')}`
      );
      error.statusCode = 400;
      error.code = 'INVALID_STATUS';
      return next(error);
    }

    const application = await Application.findById(targetApplicationId).populate(
      'internship',
      'title company companyName'
    );

    if (!application) {
      const error = new Error('Application not found.');
      error.statusCode = 404;
      error.code = 'APPLICATION_NOT_FOUND';
      return next(error);
    }

    const userRole = req.user.role;
    const userId = req.user.id || req.user._id.toString();

    // Prevent students from modifying review status
    if (userRole === ROLES.STUDENT) {
      const error = new Error('Students are not authorized to update application review status.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_REVIEWER_ONLY';
      return next(error);
    }

    // Company boundary check: companies can only review their own applications
    if (userRole === ROLES.COMPANY || userRole === ROLES.MENTOR) {
      const isCompanyOwner = application.company.toString() === userId;
      if (!isCompanyOwner) {
        const error = new Error(
          'Access denied: You are not authorized to review or modify applications for another company.'
        );
        error.statusCode = 403;
        error.code = 'FORBIDDEN_APPLICATION_ACCESS';
        return next(error);
      }
    }

    // Check valid status transitions
    const currentStatus = application.status;
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(targetStatus) && currentStatus !== targetStatus) {
      const error = new Error(
        `Invalid status transition: Cannot change application from '${currentStatus}' to '${targetStatus}'.`
      );
      error.statusCode = 400;
      error.code = 'INVALID_STATUS_TRANSITION';
      return next(error);
    }

    // Rejection reason mandate
    const finalReason = decisionReason || reason;
    if (targetStatus === APPLICATION_STATUSES.REJECTED) {
      if (!finalReason || typeof finalReason !== 'string' || finalReason.trim().length < 5) {
        const error = new Error(
          'A decision reason (minimum 5 characters) is required when rejecting a candidate application.'
        );
        error.statusCode = 400;
        error.code = 'REJECTION_REASON_REQUIRED';
        return next(error);
      }
    }

    req.application = application;
    req.finalReason = finalReason;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Validates student withdrawal of their own application.
 */
export const validateWithdrawApplication = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const application = await Application.findById(applicationId);

    if (!application) {
      const error = new Error('Application not found.');
      error.statusCode = 404;
      error.code = 'APPLICATION_NOT_FOUND';
      return next(error);
    }

    // Only the applying student can withdraw their application
    if (application.student.toString() !== req.user.id) {
      const error = new Error('You can only withdraw your own applications.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_OWNERSHIP';
      return next(error);
    }

    // Cannot withdraw if already withdrawn or terminal decision reached
    if (application.status === APPLICATION_STATUSES.WITHDRAWN) {
      const error = new Error('This application has already been withdrawn.');
      error.statusCode = 400;
      error.code = 'ALREADY_WITHDRAWN';
      return next(error);
    }

    if (application.status === APPLICATION_STATUSES.SELECTED) {
      const error = new Error(
        'This application has already been officially selected. Please contact the coordinator.'
      );
      error.statusCode = 400;
      error.code = 'CANNOT_WITHDRAW_SELECTED';
      return next(error);
    }

    req.application = application;
    next();
  } catch (err) {
    next(err);
  }
};
