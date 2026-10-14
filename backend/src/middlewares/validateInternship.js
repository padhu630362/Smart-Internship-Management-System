import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../models/Internship.js';
import { ROLES } from '../models/User.js';

/**
 * Validates payload for creating a new internship opportunity.
 */
export const validateCreateInternship = (req, res, next) => {
  const {
    title,
    description,
    workMode,
    openings,
    applicationDeadline,
    status,
    stipend,
    eligibility,
  } = req.body;

  // Title validation
  if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 150) {
    const error = new Error('Internship title is required (between 3 and 150 characters).');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Description validation
  if (!description || typeof description !== 'string' || description.trim().length < 20) {
    const error = new Error('Detailed internship description is required (minimum 20 characters).');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Work Mode validation
  if (workMode && !Object.values(WORK_MODES).includes(workMode)) {
    const error = new Error(`Work mode must be one of: ${Object.values(WORK_MODES).join(', ')}`);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Openings validation
  const parsedOpenings = Number(openings);
  if (!openings || isNaN(parsedOpenings) || parsedOpenings < 1 || !Number.isInteger(parsedOpenings)) {
    const error = new Error('Number of openings must be a positive integer greater than or equal to 1.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Application Deadline validation
  if (!applicationDeadline) {
    const error = new Error('Application deadline is required.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  const deadlineDate = new Date(applicationDeadline);
  if (isNaN(deadlineDate.getTime())) {
    const error = new Error('Invalid application deadline date format.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Deadline cannot be in the past (allow slight buffer for clock drift)
  if (deadlineDate.getTime() < Date.now() - 5 * 60 * 1000) {
    const error = new Error('Application deadline must be a future date.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Status validation if specified
  if (status && !Object.values(INTERNSHIP_STATUSES).includes(status)) {
    const error = new Error(`Status must be one of: ${Object.values(INTERNSHIP_STATUSES).join(', ')}`);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Stipend validation
  if (stipend && stipend.amount !== undefined && Number(stipend.amount) < 0) {
    const error = new Error('Stipend amount cannot be negative.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Eligibility validation
  if (eligibility?.minCgpa !== undefined && (Number(eligibility.minCgpa) < 0 || Number(eligibility.minCgpa) > 10)) {
    const error = new Error('Minimum CGPA requirement must be between 0.0 and 10.0.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  next();
};

/**
 * Validates payload for updating an existing internship opportunity.
 */
export const validateUpdateInternship = (req, res, next) => {
  const {
    title,
    description,
    workMode,
    openings,
    applicationDeadline,
    status,
    stipend,
    eligibility,
  } = req.body;

  if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 150)) {
    const error = new Error('Internship title must be between 3 and 150 characters.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  if (description !== undefined && (typeof description !== 'string' || description.trim().length < 20)) {
    const error = new Error('Internship description must be at least 20 characters.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  if (workMode !== undefined && !Object.values(WORK_MODES).includes(workMode)) {
    const error = new Error(`Work mode must be one of: ${Object.values(WORK_MODES).join(', ')}`);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  if (openings !== undefined) {
    const parsedOpenings = Number(openings);
    if (isNaN(parsedOpenings) || parsedOpenings < 1 || !Number.isInteger(parsedOpenings)) {
      const error = new Error('Number of openings must be a positive integer greater than or equal to 1.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      return next(error);
    }
  }

  if (applicationDeadline !== undefined) {
    const deadlineDate = new Date(applicationDeadline);
    if (isNaN(deadlineDate.getTime())) {
      const error = new Error('Invalid application deadline date format.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      return next(error);
    }
  }

  if (status !== undefined && !Object.values(INTERNSHIP_STATUSES).includes(status)) {
    const error = new Error(`Status must be one of: ${Object.values(INTERNSHIP_STATUSES).join(', ')}`);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  if (stipend && stipend.amount !== undefined && Number(stipend.amount) < 0) {
    const error = new Error('Stipend amount cannot be negative.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  if (eligibility?.minCgpa !== undefined && (Number(eligibility.minCgpa) < 0 || Number(eligibility.minCgpa) > 10)) {
    const error = new Error('Minimum CGPA requirement must be between 0.0 and 10.0.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  next();
};

/**
 * Enforces company boundary: ensures companies can only access/modify opportunities
 * created by or assigned to their account.
 */
export const checkOpportunityOwnership = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const opportunity = await Internship.findById(targetId);

    if (!opportunity) {
      const error = new Error('Internship opportunity not found.');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      return next(error);
    }

    const userRole = req.user.role;
    const userId = req.user.id || req.user._id.toString();

    // Administrators and Coordinators have oversight across all opportunities
    if (userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR) {
      req.opportunity = opportunity;
      return next();
    }

    // Company / Mentor: check ownership
    const isOwner =
      opportunity.company.toString() === userId ||
      opportunity.createdBy.toString() === userId;

    if (!isOwner) {
      const error = new Error(
        'Access denied: You are not authorized to modify or delete opportunities belonging to another company.'
      );
      error.statusCode = 403;
      error.code = 'FORBIDDEN_OPPORTUNITY_ACCESS';
      return next(error);
    }

    req.opportunity = opportunity;
    next();
  } catch (err) {
    next(err);
  }
};
