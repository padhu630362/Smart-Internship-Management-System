import { Allocation, ALLOCATION_STATUSES } from '../models/Allocation.js';
import { Internship } from '../models/Internship.js';
import { User, ROLES } from '../models/User.js';

export const validateCreateAllocation = async (req, res, next) => {
  try {
    const { studentId, internshipId, mentorId, startDate, endDate, notes } = req.body;

    if (!studentId || !internshipId || !startDate || !endDate) {
      const error = new Error('Student ID, Internship ID, Start Date, and End Date are required.');
      error.statusCode = 400;
      error.code = 'MISSING_REQUIRED_FIELDS';
      return next(error);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const error = new Error('Invalid start date or end date format.');
      error.statusCode = 400;
      error.code = 'INVALID_DATE_FORMAT';
      return next(error);
    }

    if (end < start) {
      const error = new Error('Internship end date cannot precede start date.');
      error.statusCode = 400;
      error.code = 'INVALID_DATE_RANGE';
      return next(error);
    }

    // Verify student user
    const student = await User.findById(studentId);
    if (!student || student.role !== ROLES.STUDENT) {
      const error = new Error('Selected user is not an active student candidate.');
      error.statusCode = 400;
      error.code = 'INVALID_STUDENT_USER';
      return next(error);
    }

    // Verify internship
    const internship = await Internship.findById(internshipId);
    if (!internship) {
      const error = new Error('Internship opportunity not found.');
      error.statusCode = 404;
      error.code = 'INTERNSHIP_NOT_FOUND';
      return next(error);
    }

    // Company authorization boundary
    const userRole = req.user.role;
    const isCompanyUser = userRole === ROLES.COMPANY;
    const isMentorUser = userRole === ROLES.MENTOR;
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

    if (isCompanyUser && internship.company.toString() !== req.user.id) {
      const error = new Error('You can only allocate candidates to your company opportunities.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_COMPANY_ALLOCATION';
      return next(error);
    }

    if (!isCompanyUser && !isMentorUser && !isPrivileged) {
      const error = new Error('Unauthorized: Only coordinators, company hosts, or mentors can allocate students.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_ALLOCATION_AUTHORITY';
      return next(error);
    }

    // Prevent conflicting active allocations
    const conflictingAllocation = await Allocation.findOne({
      student: studentId,
      status: { $in: [ALLOCATION_STATUSES.ACTIVE, ALLOCATION_STATUSES.PENDING] },
    });

    if (conflictingAllocation) {
      const error = new Error(
        'Student already has an active or pending internship allocation. Concurrent active allocations are prohibited.'
      );
      error.statusCode = 409;
      error.code = 'CONFLICTING_ACTIVE_ALLOCATION';
      return next(error);
    }

    // Verify mentor if provided
    let verifiedMentorId = null;
    if (mentorId) {
      const mentor = await User.findById(mentorId);
      if (!mentor || (mentor.role !== ROLES.MENTOR && mentor.role !== ROLES.COMPANY)) {
        const error = new Error('Selected mentor must have mentor or employer credentials.');
        error.statusCode = 400;
        error.code = 'INVALID_MENTOR_USER';
        return next(error);
      }
      verifiedMentorId = mentor._id;
    }

    req.targetStudent = student;
    req.targetInternship = internship;
    req.verifiedMentorId = verifiedMentorId;
    req.parsedStartDate = start;
    req.parsedEndDate = end;

    next();
  } catch (err) {
    next(err);
  }
};

export const validateUpdateAllocationStatus = async (req, res, next) => {
  try {
    const { status, note, reason } = req.body;
    const allocationId = req.params.id;

    if (!status || !Object.values(ALLOCATION_STATUSES).includes(status)) {
      const error = new Error(
        `Valid allocation status is required. Choose from: ${Object.values(ALLOCATION_STATUSES).join(', ')}.`
      );
      error.statusCode = 400;
      error.code = 'INVALID_ALLOCATION_STATUS';
      return next(error);
    }

    const allocation = await Allocation.findById(allocationId);
    if (!allocation) {
      const error = new Error('Allocation record not found.');
      error.statusCode = 404;
      error.code = 'ALLOCATION_NOT_FOUND';
      return next(error);
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const isCompany = allocation.company.toString() === userId;
    const isMentor = allocation.mentor && allocation.mentor.toString() === userId;
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

    if (!isCompany && !isMentor && !isPrivileged) {
      const error = new Error('You are not authorized to update this allocation.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_ALLOCATION_UPDATE';
      return next(error);
    }

    req.allocation = allocation;
    next();
  } catch (err) {
    next(err);
  }
};
