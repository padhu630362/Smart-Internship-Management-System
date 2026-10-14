import apiClient from '../api/client';

/**
 * Service to query backend health and runtime diagnostics with strict timeouts
 */
export const healthService = {
  checkHealth: async (timeoutMs = 3000) => {
    try {
      const response = await apiClient.get('/health', { timeout: timeoutMs });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message || 'Backend service unreachable',
          code: error.code || 'UNREACHABLE'
        }
      };
    }
  },

  checkDatabaseHealth: async (timeoutMs = 3000) => {
    try {
      const response = await apiClient.get('/health/db', {
        params: { timeout: timeoutMs },
        timeout: timeoutMs + 1000
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message || 'Database unreachable',
          code: error.code || 'DATABASE_UNREACHABLE'
        }
      };
    }
  }
};

export default healthService;
