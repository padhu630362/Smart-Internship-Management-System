import apiClient from '../api/client';

export const analyticsService = {
  /**
   * Fetch role-specific real dynamic dashboard metrics from backend
   */
  async getDashboardAnalytics() {
    const response = await apiClient.get('/api/analytics/dashboard');
    return response.data;
  },
};

export default analyticsService;
