import apiClient from '../api/client';

// In-memory cache to prevent duplicate aggregations on repeated page transitions
let cachedAnalytics = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 25000; // 25 seconds fresh cache

export const analyticsService = {
  /**
   * Fetch role-specific real dynamic dashboard metrics from backend
   * @param {boolean} forceRefresh - Bypass client cache if true
   */
  async getDashboardAnalytics(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedAnalytics && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedAnalytics;
    }
    const response = await apiClient.get('/api/analytics/dashboard');
    cachedAnalytics = response.data;
    cacheTimestamp = now;
    return response.data;
  },

  clearCache() {
    cachedAnalytics = null;
    cacheTimestamp = 0;
  },
};

export default analyticsService;
