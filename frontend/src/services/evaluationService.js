import apiClient from '../api/client';

export const EVALUATION_TYPES = {
  MID_TERM: 'mid_term',
  FINAL: 'final',
};

export const evaluationService = {
  /**
   * Submit an internship appraisal / evaluation
   * @param {Object} data - { allocationId, evaluationType, ratings, feedback, recommendation, isPassed }
   */
  async createEvaluation(data) {
    const response = await apiClient.post('/api/evaluations', data);
    return response.data;
  },

  /**
   * List evaluations with filters
   * @param {Object} params - { allocationId, studentId, evaluationType, page, limit }
   */
  async getEvaluations(params = {}) {
    const response = await apiClient.get('/api/evaluations', { params });
    return response.data;
  },

  /**
   * Get single evaluation by ID
   */
  async getEvaluationById(id) {
    const response = await apiClient.get(`/api/evaluations/${id}`);
    return response.data;
  },

  /**
   * Get evaluations for a specific allocation (returns midTerm and final breakdown)
   */
  async getEvaluationsByAllocation(allocationId) {
    const response = await apiClient.get(`/api/evaluations/allocation/${allocationId}`);
    return response.data;
  },
};

export default evaluationService;
