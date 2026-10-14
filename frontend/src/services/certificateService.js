import apiClient from '../api/client';

export const certificateService = {
  /**
   * Fetch certificates awarded to current authenticated student
   */
  async getMyCertificates() {
    const response = await apiClient.get('/api/certificates/my');
    return response.data;
  },

  /**
   * Retrieve certificate metadata by ID
   */
  async getCertificateById(id) {
    const response = await apiClient.get(`/api/certificates/${id}`);
    return response.data;
  },

  /**
   * Public credential verification check by certificateNumber or verificationCode
   */
  async verifyCertificate(code) {
    const response = await apiClient.get(`/api/certificates/verify/${encodeURIComponent(code)}`);
    return response.data;
  },

  /**
   * Constructs secure authenticated URL for downloading/viewing certificate PDF
   */
  getCertificateDownloadUrl(id, token, download = false) {
    const authToken = token || localStorage.getItem('sims_auth_token') || '';
    const baseUrl = `/api/certificates/${id}/download`;
    const params = new URLSearchParams();
    if (authToken) params.append('token', authToken);
    if (download) params.append('download', 'true');
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  },
};

export default certificateService;

