import apiClient from '../api/client';

/**
 * Service to query backend health and runtime diagnostics
 */
export const healthService = {
  checkHealth: async () => {
    try {
      const response = await apiClient.get('/health');
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
  }
};

export default healthService;
