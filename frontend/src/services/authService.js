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
   * Log in with email and password.
   */
  login: async ({ email, password }) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
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
   * Request password reset token.
   */
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Confirm password reset with token.
   */
  resetPassword: async ({ token, newPassword }) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },
};

export default authService;
