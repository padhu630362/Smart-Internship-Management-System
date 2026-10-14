import apiClient from '../api/client';

export const userService = {
  /**
   * Fetch current user's profile
   */
  async getProfile() {
    const response = await apiClient.get('/api/users/profile');
    return response.data;
  },

  /**
   * Update current user's permitted profile fields
   */
  async updateProfile(profileData) {
    const response = await apiClient.put('/api/users/profile', profileData);
    return response.data;
  },

  /**
   * Upload resume file (Students only)
   */
  async uploadResume(file) {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await apiClient.post('/api/users/profile/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Delete uploaded resume
   */
  async deleteResume() {
    const response = await apiClient.delete('/api/users/profile/resume');
    return response.data;
  },

  /**
   * Admin: List users with pagination, filters, and search
   */
  async getUsers(params = {}) {
    const response = await apiClient.get('/api/users', { params });
    return response.data;
  },

  /**
   * Admin: Get single user by ID
   */
  async getUserById(id) {
    const response = await apiClient.get(`/api/users/${id}`);
    return response.data;
  },

  /**
   * Admin: Create a new user with any authorized role
   */
  async createUser(userData) {
    const response = await apiClient.post('/api/users', userData);
    return response.data;
  },

  /**
   * Admin: Update user details, role, status
   */
  async updateUser(id, userData) {
    const response = await apiClient.put(`/api/users/${id}`, userData);
    return response.data;
  },

  /**
   * Admin: Update user status
   */
  async updateUserStatus(id, status) {
    const response = await apiClient.patch(`/api/users/${id}/status`, { status });
    return response.data;
  },

  /**
   * Admin: Delete user
   */
  async deleteUser(id) {
    const response = await apiClient.delete(`/api/users/${id}`);
    return response.data;
  },
};

export default userService;
