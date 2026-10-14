import apiClient from '../api/client';

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  COMPLETED: 'completed',
  REVISION_REQUESTED: 'revision_requested',
};

export const taskService = {
  /**
   * Mentor/Company assigns new task to intern
   */
  async createTask(taskData) {
    const response = await apiClient.post('/api/tasks', taskData);
    return response.data;
  },

  /**
   * Retrieve list of tasks with filters
   */
  async getTasks(params = {}) {
    const response = await apiClient.get('/api/tasks', { params });
    return response.data;
  },

  /**
   * Retrieve single task details by ID
   */
  async getTaskById(id) {
    const response = await apiClient.get(`/api/tasks/${id}`);
    return response.data;
  },

  /**
   * Intern submits progress or completion notes/links
   */
  async submitTaskProgress(id, { progressPercentage, submissionNotes, submissionLink, status }) {
    const response = await apiClient.patch(`/api/tasks/${id}/progress`, {
      progressPercentage,
      submissionNotes,
      submissionLink,
      status,
    });
    return response.data;
  },

  /**
   * Mentor reviews task and updates status
   */
  async reviewTask(id, { status, reviewerFeedback }) {
    const response = await apiClient.patch(`/api/tasks/${id}/review`, {
      status,
      reviewerFeedback,
    });
    return response.data;
  },
};

export default taskService;
