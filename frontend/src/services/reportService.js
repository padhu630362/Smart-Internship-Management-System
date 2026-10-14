import apiClient from '../api/client';

export const reportService = {
  /**
   * Fetch filtered report records and summaries
   * @param {Object} params - { type, startDate, endDate, department, company, internship, status, page, limit }
   */
  async getReportData(params = {}) {
    const response = await apiClient.get('/api/reports', { params });
    return response.data;
  },

  /**
   * Download CSV export file
   * @param {Object} params - { type, startDate, endDate, department, company, internship, status }
   */
  async downloadReportCSV(params = {}) {
    const response = await apiClient.get('/api/reports/export', {
      params,
      responseType: 'blob',
    });

    // Create browser blob download link
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Determine filename from content-disposition header if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = `sims-report-${params.type || 'export'}-${Date.now()}.csv`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match?.[1]) filename = match[1];
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return true;
  },
};

export default reportService;
