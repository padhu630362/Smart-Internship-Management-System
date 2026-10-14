import { Attendance, ATTENDANCE_STATUSES, ATTENDANCE_REVIEW_STATUSES } from '../models/Attendance.js';
import { ROLES } from '../models/User.js';
import {
  createAndDispatchNotification,
  NOTIFICATION_TYPES,
} from '../services/notificationService.js';
import { recordAuditLog } from '../services/auditService.js';

/**
 * Intern submits daily attendance
 */
export const submitAttendance = async (req, res, next) => {
  try {
    const { checkInTime, checkOutTime, workSummary } = req.body;
    const allocation = req.activeAllocation;
    const normalizedDate = req.normalizedDate;
    const status = req.effectiveStatus;

    const attendance = await Attendance.create({
      student: req.user.id,
      allocation: allocation._id,
      company: allocation.company,
      date: normalizedDate,
      status,
      checkInTime: checkInTime ? checkInTime.trim() : '',
      checkOutTime: checkOutTime ? checkOutTime.trim() : '',
      workSummary: workSummary ? workSummary.trim() : '',
      reviewStatus: ATTENDANCE_REVIEW_STATUSES.SUBMITTED,
    });

    res.status(201).json({
      success: true,
      message: 'Daily attendance successfully recorded.',
      data: { attendance },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List attendance records with filtering and pagination
 */
export const getAttendanceRecords = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const query = {};
    const userRole = req.user.role;

    if (userRole === ROLES.STUDENT) {
      query.student = req.user.id;
    } else if (userRole === ROLES.COMPANY) {
      query.company = req.user.id;
    } else if ((userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR) && req.query.companyId) {
      query.company = req.query.companyId;
    }

    if (req.query.studentId && userRole !== ROLES.STUDENT) {
      query.student = req.query.studentId;
    }

    if (req.query.allocationId) {
      query.allocation = req.query.allocationId;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.reviewStatus && req.query.reviewStatus !== 'all') {
      query.reviewStatus = req.query.reviewStatus;
    }

    // Month & Year filtering
    if (req.query.year && req.query.month) {
      const year = parseInt(req.query.year);
      const month = parseInt(req.query.month) - 1; // 0-indexed
      const startDate = new Date(Date.UTC(year, month, 1));
      const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      query.date = { $gte: startDate, $lte: endDate };
    }

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('student', 'name email profile')
        .populate('allocation', 'startDate endDate status')
        .populate('reviewedBy', 'name email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get monthly attendance summary stats
 */
export const getMonthlyAttendanceSummary = async (req, res, next) => {
  try {
    const studentId = req.user.role === ROLES.STUDENT ? req.user.id : (req.query.studentId || req.user.id);

    if (!studentId) {
      const error = new Error('Student ID is required to calculate monthly attendance summary.');
      error.statusCode = 400;
      error.code = 'STUDENT_ID_REQUIRED';
      return next(error);
    }

    const now = new Date();
    const year = parseInt(req.query.year) || now.getUTCFullYear();
    const month = parseInt(req.query.month) || (now.getUTCMonth() + 1);

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const records = await Attendance.find({
      student: studentId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let remoteCount = 0;
    let excusedCount = 0;

    for (const rec of records) {
      switch (rec.status) {
        case ATTENDANCE_STATUSES.PRESENT:
          presentCount++;
          break;
        case ATTENDANCE_STATUSES.ABSENT:
          absentCount++;
          break;
        case ATTENDANCE_STATUSES.HALF_DAY:
          halfDayCount++;
          break;
        case ATTENDANCE_STATUSES.REMOTE:
          remoteCount++;
          break;
        case ATTENDANCE_STATUSES.EXCUSED:
          excusedCount++;
          break;
        default:
          break;
      }
    }

    const totalDays = records.length;
    const effectiveDays = presentCount + remoteCount + halfDayCount * 0.5;
    const attendanceRate = totalDays > 0 ? Math.round((effectiveDays / totalDays) * 100) : 100;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          year,
          month,
          totalDays,
          presentCount,
          absentCount,
          halfDayCount,
          remoteCount,
          excusedCount,
          attendanceRate,
        },
        records,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Review, approve, or correct attendance record
 */
export const reviewAttendanceRecord = async (req, res, next) => {
  try {
    const attendance = req.attendance;
    const { reviewStatus, reviewNotes, newStatus, reason } = req.body;

    const prevReviewStatus = attendance.reviewStatus;
    attendance.reviewStatus = reviewStatus;
    attendance.reviewedBy = req.user.id;
    attendance.reviewedAt = new Date();

    if (reviewNotes !== undefined) {
      attendance.reviewNotes = reviewNotes.trim();
    }

    let prevStatus = attendance.status;
    if (reviewStatus === ATTENDANCE_REVIEW_STATUSES.CORRECTED) {
      prevStatus = attendance.status;
      attendance.status = newStatus;

      attendance.correctionHistory.push({
        correctedBy: req.user.id,
        correctedByName: req.user.name,
        correctedAt: new Date(),
        previousStatus: prevStatus,
        newStatus,
        reason: reason.trim(),
        note: reviewNotes ? reviewNotes.trim() : '',
      });
    }

    await attendance.save();

    // Record regulatory audit log
    await recordAuditLog({
      action: 'ATTENDANCE_CORRECTED',
      req,
      targetUser: attendance.student,
      targetResource: attendance._id,
      resourceType: 'Attendance',
      details: {
        previousReviewStatus: prevReviewStatus,
        newReviewStatus: reviewStatus,
        previousStatus: prevStatus,
        newStatus: newStatus || prevStatus,
        reason: reason ? reason.trim() : undefined,
        attendanceDate: attendance.date,
      },
    });

    // Notify student of attendance review
    const formattedDate = new Date(attendance.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    createAndDispatchNotification({
      recipientId: attendance.student,
      senderId: req.user.id,
      type: NOTIFICATION_TYPES.ATTENDANCE_REVIEWED,
      title: 'Attendance Record Reviewed',
      message: `Your attendance record for ${formattedDate} was marked as '${reviewStatus}'.`,
      link: '/attendance',
      metadata: {
        attendanceId: attendance._id,
        reviewStatus,
        date: attendance.date,
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Attendance marked as '${reviewStatus}'.`,
      data: { attendance },
    });
  } catch (err) {
    next(err);
  }
};
