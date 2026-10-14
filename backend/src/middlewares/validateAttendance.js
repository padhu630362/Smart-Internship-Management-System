import { Attendance, ATTENDANCE_STATUSES, ATTENDANCE_REVIEW_STATUSES } from '../models/Attendance.js';
import { Allocation, ALLOCATION_STATUSES } from '../models/Allocation.js';
import { ROLES } from '../models/User.js';

/**
 * Normalizes any Date or ISO string to UTC Start of Day (00:00:00.000Z)
 */
export const normalizeDateToUTCStartOfDay = (dateObj) => {
  const d = new Date(dateObj);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

export const validateSubmitAttendance = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { date, status, checkInTime, checkOutTime, workSummary } = req.body;

    // Student must have an active allocation
    const activeAllocation = await Allocation.findOne({
      student: studentId,
      status: ALLOCATION_STATUSES.ACTIVE,
    });

    if (!activeAllocation) {
      const error = new Error('No active internship allocation found. You must be actively placed to log attendance.');
      error.statusCode = 400;
      error.code = 'NO_ACTIVE_ALLOCATION';
      return next(error);
    }

    // Determine normalized date
    const inputDate = date ? new Date(date) : new Date();
    if (isNaN(inputDate.getTime())) {
      const error = new Error('Invalid attendance date format.');
      error.statusCode = 400;
      error.code = 'INVALID_DATE_FORMAT';
      return next(error);
    }

    const normalizedDate = normalizeDateToUTCStartOfDay(inputDate);
    const todayNormalized = normalizeDateToUTCStartOfDay(new Date());

    // Disallow future date submissions
    if (normalizedDate > todayNormalized) {
      const error = new Error('Attendance cannot be recorded for future dates.');
      error.statusCode = 400;
      error.code = 'FUTURE_ATTENDANCE_PROHIBITED';
      return next(error);
    }

    // Validate status
    const effectiveStatus = status || ATTENDANCE_STATUSES.PRESENT;
    if (!Object.values(ATTENDANCE_STATUSES).includes(effectiveStatus)) {
      const error = new Error(
        `Invalid status. Choose from: ${Object.values(ATTENDANCE_STATUSES).join(', ')}.`
      );
      error.statusCode = 400;
      error.code = 'INVALID_ATTENDANCE_STATUS';
      return next(error);
    }

    // Prevent duplicate attendance entries for same student and date
    const duplicateEntry = await Attendance.findOne({
      student: studentId,
      date: normalizedDate,
    });

    if (duplicateEntry) {
      const error = new Error(
        `Attendance for date ${normalizedDate.toISOString().slice(0, 10)} has already been recorded.`
      );
      error.statusCode = 409;
      error.code = 'DUPLICATE_ATTENDANCE_RECORD';
      return next(error);
    }

    req.activeAllocation = activeAllocation;
    req.normalizedDate = normalizedDate;
    req.effectiveStatus = effectiveStatus;
    next();
  } catch (err) {
    next(err);
  }
};

export const validateReviewAttendance = async (req, res, next) => {
  try {
    const { reviewStatus, reviewNotes, newStatus, reason } = req.body;
    const attendanceId = req.params.id;

    if (!reviewStatus || !Object.values(ATTENDANCE_REVIEW_STATUSES).includes(reviewStatus)) {
      const error = new Error(
        `Valid review status required. Choose from: ${Object.values(ATTENDANCE_REVIEW_STATUSES).join(', ')}.`
      );
      error.statusCode = 400;
      error.code = 'INVALID_REVIEW_STATUS';
      return next(error);
    }

    const attendance = await Attendance.findById(attendanceId).populate('allocation');
    if (!attendance) {
      const error = new Error('Attendance record not found.');
      error.statusCode = 404;
      error.code = 'ATTENDANCE_NOT_FOUND';
      return next(error);
    }

    // Authorization: Company host, Assigned mentor, Coordinator, or Admin
    const userId = req.user.id;
    const userRole = req.user.role;
    const isCompany = attendance.company.toString() === userId;
    const isMentor = attendance.allocation?.mentor && attendance.allocation.mentor.toString() === userId;
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

    if (!isCompany && !isMentor && !isPrivileged) {
      const error = new Error('Unauthorized: You can only review attendance for your allocated interns.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_ATTENDANCE_REVIEW';
      return next(error);
    }

    // If correcting status, validate correction fields
    if (reviewStatus === ATTENDANCE_REVIEW_STATUSES.CORRECTED) {
      if (!newStatus || !Object.values(ATTENDANCE_STATUSES).includes(newStatus)) {
        const error = new Error(
          `When correcting attendance, a valid replacement status is required: ${Object.values(ATTENDANCE_STATUSES).join(', ')}.`
        );
        error.statusCode = 400;
        error.code = 'CORRECTION_STATUS_REQUIRED';
        return next(error);
      }

      if (!reason || !reason.trim()) {
        const error = new Error('An audit reason is mandatory when correcting attendance records.');
        error.statusCode = 400;
        error.code = 'CORRECTION_REASON_REQUIRED';
        return next(error);
      }
    }

    req.attendance = attendance;
    next();
  } catch (err) {
    next(err);
  }
};
