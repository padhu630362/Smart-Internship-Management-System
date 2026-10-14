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
};

export default allocationService;
