import apiClient from '../api/client';

export const externalJobService = {
  /**
   * Fetch active external job and internship listings with search and filter parameters
   */
  async getExternalJobs(params = {}) {
    const response = await apiClient.get('/api/external-jobs', { params });
    return response.data;
  },

  /**
   * Fetch single job details along with personalized Gemini AI fit breakdown
   */
  async getExternalJobById(id) {
    const response = await apiClient.get(`/api/external-jobs/${id}`);
    return response.data;
  },

  /**
   * Toggle save/bookmark status for student
   */
  async toggleBookmark(id) {
    const response = await apiClient.post(`/api/external-jobs/${id}/bookmark`);
    return response.data;
  },

  /**
   * Toggle applied status for student
   */
  async toggleApplied(id) {
    const response = await apiClient.post(`/api/external-jobs/${id}/apply`);
    return response.data;
  },

  /**
   * Update student notes for an external job
   */
  async updateJobNotes(id, notes) {
    const response = await apiClient.patch(`/api/external-jobs/${id}/notes`, { notes });
    return response.data;
  },

  /**
   * Retrieve all saved & applied external jobs for logged-in student
   */
  async getMyInteractions() {
    const response = await apiClient.get('/api/external-jobs/my-interactions');
    return response.data;
  },

  /**
   * Retrieve top AI-recommended opportunities for student ranked by match score
   */
  async getRecommendations(params = {}) {
    const response = await apiClient.get('/api/external-jobs/recommendations', { params });
    return response.data;
  },

  /**
   * Trigger on-demand sync of external job feeds
   */
  async syncJobs(notify = true) {
    const response = await apiClient.post('/api/external-jobs/sync', { notify });
    return response.data;
  },
};

export default externalJobService;

