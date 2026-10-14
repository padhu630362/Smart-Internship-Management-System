import apiClient from '../api/client';

export const APPLICATION_STATUSES = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  SHORTLISTED: 'shortlisted',
  INTERVIEW: 'interview',
  SELECTED: 'selected',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
};

export const applicationService = {
  /**
   * Submit application for an active internship opportunity
   */
  async applyToInternship({ internshipId, coverLetter, resumeFileName }) {
    const response = await apiClient.post('/api/applications', {
      internshipId,
      coverLetter,
      resumeFileName,
    });
    return response.data;
  },

  /**
   * Retrieve current student's applications with pagination and counters
   */
  async getMyApplications(params = {}) {
    const response = await apiClient.get('/api/applications/my', { params });
    return response.data;
  },

  /**
   * Withdraw student application with reason
   */
  async withdrawApplication(id, reason) {
    const response = await apiClient.patch(`/api/applications/${id}/withdraw`, { reason });
    return response.data;
  },

  /**
   * Company/Coordinator/Admin view candidate applications
   */
  async getCompanyApplications(params = {}) {
    const response = await apiClient.get('/api/applications', { params });
    return response.data;
  },

  /**
   * Retrieve full application details including snapshot and audit history
   */
  async getApplicationById(id) {
    const response = await apiClient.get(`/api/applications/${id}`);
    return response.data;
  },

  /**
   * Reviewer updates application status with optional review notes, interview details, and reason
   */
  async updateApplicationStatus(id, { status, reviewNotes, reason, interviewDetails }) {
    const response = await apiClient.patch(`/api/applications/${id}/status`, {
      status,
      reviewNotes,
      reason,
      interviewDetails,
    });
    return response.data;
  },
};

export default applicationService;
