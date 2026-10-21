import apiClient from '../api/client';

export const NOTIFICATION_TYPES = {
  OPPORTUNITY_PUBLISHED: 'opportunity_published',
  APPLICATION_SUBMITTED: 'application_submitted',
  APPLICATION_STATUS: 'application_status',
  INTERN_ALLOCATED: 'intern_allocated',
  TASK_ASSIGNED: 'task_assigned',
  TASK_FEEDBACK: 'task_feedback',
  TASK_DEADLINE: 'task_deadline',
  ATTENDANCE_REVIEWED: 'attendance_reviewed',
  MENTOR_ANNOUNCEMENT: 'mentor_announcement',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  CERTIFICATE_ISSUED: 'certificate_issued',
  JOB_ALERT: 'job_alert',
  USER_REGISTERED: 'user_registered',
  NEW_MESSAGE: 'new_message',
};

export const notificationService = {
  /**
   * Fetch current user's notifications with pagination and unread filters
   */
  async getNotifications(params = {}) {
    const response = await apiClient.get('/api/notifications', { params });
    return response.data;
  },

  /**
   * Fast retrieval of unread notifications count
   */
  async getUnreadCount() {
    const response = await apiClient.get('/api/notifications/unread-count');
    return response.data;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id) {
    const response = await apiClient.patch(`/api/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all unread notifications for a conversation as read
   */
  async markConversationAsRead(conversationId) {
    const response = await apiClient.patch(`/api/notifications/conversation/${conversationId}/read`);
    return response.data;
  },

  /**
   * Mark all unread notifications as read for current user
   */
  async markAllAsRead() {
    const response = await apiClient.patch('/api/notifications/read-all');
    return response.data;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id) {
    const response = await apiClient.delete(`/api/notifications/${id}`);
    return response.data;
  },

  /**
   * Clear notifications (all or only read)
   */
  async clearAllNotifications(params = {}) {
    const response = await apiClient.delete('/api/notifications', { params });
    return response.data;
  },

  /**
   * Broadcast announcement (Mentors, Coordinators, Admins)
   */
  async createAnnouncement(payload) {
    const response = await apiClient.post('/api/notifications/announcements', payload);
    return response.data;
  },
};

export default notificationService;
