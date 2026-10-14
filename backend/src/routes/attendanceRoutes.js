import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  validateSubmitAttendance,
  validateReviewAttendance,
} from '../middlewares/validateAttendance.js';
import {
  submitAttendance,
  getAttendanceRecords,
  getMonthlyAttendanceSummary,
  reviewAttendanceRecord,
} from '../controllers/attendanceController.js';

const router = Router();

// Student submits daily attendance
router.post(
  '/',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  validateSubmitAttendance,
  submitAttendance
);

// Monthly attendance summary
router.get('/summary', authenticateToken, getMonthlyAttendanceSummary);

// List attendance records
router.get('/', authenticateToken, getAttendanceRecords);

// Review/Correct attendance record
router.patch(
  '/:id/review',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  validateReviewAttendance,
  reviewAttendanceRecord
);

export default router;
