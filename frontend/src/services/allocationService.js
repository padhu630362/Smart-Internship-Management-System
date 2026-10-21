import apiClient from '../api/client';

export const ALLOCATION_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  TERMINATED: 'terminated',
};

export const allocationService = {
  /**
   * Create an internship allocation
   */
  async createAllocation(allocationData) {
    const response = await apiClient.post('/api/allocations', allocationData);
    return response.data;
  },

  /**
   * List allocations with filtering and pagination
   */
  async getAllocations(params = {}) {
    const response = await apiClient.get('/api/allocations', { params });
    return response.data;
  },

  /**
   * Retrieve single allocation by ID
   */
  async getAllocationById(id) {
    const response = await apiClient.get(`/api/allocations/${id}`);
    return response.data;
  },

  /**
   * Update allocation status
   */
  async updateAllocationStatus(id, { status, note, reason }) {
    const response = await apiClient.patch(`/api/allocations/${id}/status`, {
      status,
      note,
      reason,
    });
    return response.data;
  },

  /**
   * Retrieve completion eligibility and tasks breakdown
   */
  async getCompletionEligibility(id) {
    const response = await apiClient.get(`/api/allocations/${id}/completion-eligibility`);
    return response.data;
  },

  /**
   * Student requests completion
   */
  async requestCompletion(id, { studentNotes, preferredDeliveryEmail } = {}) {
    const response = await apiClient.post(`/api/allocations/${id}/request-completion`, {
      studentNotes,
      preferredDeliveryEmail,
    });
    return response.data;
  },

  /**
   * Mentor / Authorized Reviewer reviews completion
   */
  async reviewCompletion(id, { decision, feedback, deliveryEmail } = {}) {
    const response = await apiClient.post(`/api/allocations/${id}/review-completion`, {
      decision,
      feedback,
      deliveryEmail,
    });
    return response.data;
  },

  /**
   * Seed demo intern allocations for testing workflow
   */
  async seedDemo() {
    const response = await apiClient.post('/api/allocations/seed-demo');
    return response.data;
  },
};

export default allocationService;
