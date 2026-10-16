import apiClient from '../api/client';

export const authService = {
  /**
   * Register a new student or company account.
   */
  register: async ({ name, email, password, role, profile }) => {
    const response = await apiClient.post('/auth/register', {
      name,
      email,
      password,
      role,
      profile,
    });
    return response.data;
  },

  /**
   * Log in with email and password (triggers 2-step verification).
   */
  login: async ({ email, password }) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Verify 6-digit Two-Step Verification code during login.
   */
  verifyTwoFactor: async ({ email, code }) => {
    const response = await apiClient.post('/auth/login-verify-2fa', { email, code });
    return response.data;
  },

  /**
   * Resend 6-digit Two-Step Verification code.
   */
  resendTwoFactor: async (email) => {
    const response = await apiClient.post('/auth/resend-2fa', { email });
    return response.data;
  },

  /**
   * Retrieve profile of the currently logged in user.
   */
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Log out session.
   */
  logout: async () => {
    try {
      const response = await apiClient.post('/auth/logout');
      return response.data;
    } catch {
      // Stateless token logout always succeeds client-side
      return { success: true };
    }
  },

  /**
   * Request password reset 6-digit verification code.
   */
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Verify 6-digit verification code.
   */
  verifyResetCode: async ({ email, code }) => {
    const response = await apiClient.post('/auth/verify-reset-code', { email, code });
    return response.data;
  },

  /**
   * Confirm password reset with token or verification code.
   */
  resetPassword: async ({ token, email, code, newPassword }) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      email,
      code,
      newPassword,
    });
    return response.data;
  },

  /**
   * Google OAuth sign-in and registration
   */
  googleLogin: async ({ credential, role }) => {
    const response = await apiClient.post('/auth/google', {
      credential,
      role,
    });
    return response.data;
  },

  /**
   * Get Two-Factor Authentication status.
   */
  getTwoFactorStatus: async () => {
    const response = await apiClient.get('/auth/2fa/status');
    return response.data;
  },

  /**
   * Request 6-digit confirmation code to enable 2FA.
   */
  requestEnableTwoFactor: async () => {
    const response = await apiClient.post('/auth/2fa/enable-request');
    return response.data;
  },

  /**
   * Confirm enabling 2FA with 6-digit OTP.
   */
  confirmEnableTwoFactor: async ({ code }) => {
    const response = await apiClient.post('/auth/2fa/enable-confirm', { code });
    return response.data;
  },

  /**
   * Disable 2FA with current password.
   */
  disableTwoFactor: async ({ password }) => {
    const response = await apiClient.post('/auth/2fa/disable', { password });
    return response.data;
  },

  /**
   * Fetch active login sessions.
   */
  getSessions: async () => {
    const response = await apiClient.get('/auth/sessions');
    return response.data;
  },

  /**
   * Revoke a specific active session.
   */
  revokeSession: async (sessionId) => {
    const response = await apiClient.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Revoke all other active sessions.
   */
  revokeOtherSessions: async () => {
    const response = await apiClient.post('/auth/sessions/revoke-others');
    return response.data;
  },
};

export default authService;
