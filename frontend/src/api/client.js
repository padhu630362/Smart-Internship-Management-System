import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Pre-configured Axios instance for SIMS API requests
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT token and normalize endpoint URLs
apiClient.interceptors.request.use(
  (config) => {
    // Normalize endpoint URL: prevent duplicate '/api' prefix if baseURL already ends with '/api'
    if (config.baseURL && config.baseURL.endsWith('/api') && config.url && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api/, '');
    }

    const token = localStorage.getItem('sims_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to format errors uniformly and handle expired sessions
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status || 500;
    const errorCode = error.response?.data?.error?.code || 'NETWORK_ERROR';
    const errorMessage = error.response?.data?.error?.message || error.message || 'Network request failed';

    // If session expired, token invalid, or account revoked/deactivated, clear stale credentials
    const isSessionInvalid =
      status === 401 ||
      (status === 403 &&
        ['ACCOUNT_SUSPENDED', 'ACCOUNT_INACTIVE', 'ACCOUNT_DEACTIVATED'].includes(errorCode));

    if (isSessionInvalid) {
      localStorage.removeItem('sims_auth_token');
      window.dispatchEvent(new Event('sims-session-expired'));
    }

    const customError = {
      message: errorMessage,
      code: errorCode,
      status,
      details: error.response?.data?.error?.details || [],
    };

    return Promise.reject(customError);
  }
);

export default apiClient;
