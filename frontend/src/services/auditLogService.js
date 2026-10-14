import apiClient from '../api/client';

export const auditLogService = {
  /**
   * Admin retrieves immutable platform security and action audit logs
   */
  async getAuditLogs(params = {}) {
    const response = await apiClient.get('/api/audit-logs', { params });
    return response.data;
  },
};

export default auditLogService;

