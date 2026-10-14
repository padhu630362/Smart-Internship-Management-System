import apiClient from '../api/client';

export const internshipService = {
  /**
   * Fetch published internship opportunities for students and public directory
   */
  async getPublicInternships(params = {}) {
    const response = await apiClient.get('/api/internships', { params });
    return response.data;
  },

  /**
   * Retrieve single internship opportunity by ID
   */
  async getInternshipById(id) {
    const response = await apiClient.get(`/api/internships/${id}`);
    return response.data;
  },

  /**
   * Management console: retrieve opportunities for company or institutional oversight
   */
  async getCompanyInternships(params = {}) {
    const response = await apiClient.get('/api/internships/manage', { params });
    return response.data;
  },

  /**
   * Create a new internship opportunity
   */
  async createInternship(opportunityData) {
    const response = await apiClient.post('/api/internships', opportunityData);
    return response.data;
  },

  /**
   * Update an existing internship opportunity
   */
  async updateInternship(id, opportunityData) {
    const response = await apiClient.put(`/api/internships/${id}`, opportunityData);
    return response.data;
  },

  /**
   * Update opportunity status (draft, published, closed, archived)
   */
  async updateInternshipStatus(id, status) {
    const response = await apiClient.patch(`/api/internships/${id}/status`, { status });
    return response.data;
  },

  /**
   * Delete an internship opportunity
   */
  async deleteInternship(id) {
    const response = await apiClient.delete(`/api/internships/${id}`);
    return response.data;
  },

  /**
   * Get student match score and skills compatibility breakdown
   */
  async getMatchScore(id) {
    const response = await apiClient.get(`/api/internships/${id}/match-score`);
    return response.data;
  },
};

export default internshipService;
