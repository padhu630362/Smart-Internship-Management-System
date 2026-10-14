import apiClient from '../api/client';

export const ATTENDANCE_STATUSES = {
  PRESENT: 'present',
  ABSENT: 'absent',
  HALF_DAY: 'half_day',
  REMOTE: 'remote',
  EXCUSED: 'excused',
};

export const ATTENDANCE_REVIEW_STATUSES = {
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CORRECTED: 'corrected',
};

export const attendanceService = {
  /**
   * Intern logs daily attendance
   */
  async submitAttendance(data) {
    const response = await apiClient.post('/api/attendance', data);
    return response.data;
  },

  /**
   * Retrieve list of attendance records
   */
  async getAttendanceRecords(params = {}) {
    const response = await apiClient.get('/api/attendance', { params });
    return response.data;
  },

  /**
   * Retrieve monthly attendance stats summary
   */
  async getMonthlyAttendanceSummary(params = {}) {
    const response = await apiClient.get('/api/attendance/summary', { params });
    return response.data;
  },

  /**
   * Review or correct an attendance record
   */
  async reviewAttendanceRecord(id, { reviewStatus, reviewNotes, newStatus, reason }) {
    const response = await apiClient.patch(`/api/attendance/${id}/review`, {
      reviewStatus,
      reviewNotes,
      newStatus,
      reason,
    });
    return response.data;
  },
};

export default attendanceService;
