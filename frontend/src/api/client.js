import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Pre-configured Axios instance for InternHub API requests
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Helper to update auth token in sessionStorage and in Axios defaults synchronously.
 * Using sessionStorage ensures that opening new tabs starts with a fresh login and sessions are tab-isolated.
 */
export const setAuthToken = (token) => {
  if (token) {
    try {
      sessionStorage.setItem('sims_auth_token', token);
      localStorage.removeItem('sims_auth_token');
    } catch {}
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    try {
      sessionStorage.removeItem('sims_auth_token');
      localStorage.removeItem('sims_auth_token');
    } catch {}
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Initialize default Authorization header if token exists in session storage
try {
  // Clear legacy persistent credentials from localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('sims_auth_token');
    localStorage.removeItem('sims_auth_user');
  }

  const initialToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sims_auth_token') : null;
  if (initialToken) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
  }
} catch {
  // Session storage access restricted or unavailable
}

// Request interceptor to automatically attach JWT token and normalize endpoint URLs
apiClient.interceptors.request.use(
  (config) => {
    // Robust URL normalization: Ensure endpoint targets /api/... cleanly regardless of baseURL convention
    const baseClean = (config.baseURL || '').replace(/\/+$/, '');
    const urlClean = (config.url || '');

    // If baseURL ends with /api (e.g. '/api' or 'http://127.0.0.1:5001/api')
    if (baseClean.endsWith('/api') && urlClean.startsWith('/api/')) {
      config.url = urlClean.replace(/^\/api/, '');
    } else if (baseClean && !baseClean.endsWith('/api') && !urlClean.startsWith('/api/') && !urlClean.startsWith('http')) {
      // If baseURL does NOT include /api, ensure endpoint gets /api prefix
      config.url = `/api${urlClean.startsWith('/') ? '' : '/'}${urlClean}`;
    }

    const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sims_auth_token') : null;
    if (token) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to format errors uniformly, auto-retry idempotent network glitches, and handle expired sessions
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    // Automatic 1-time retry for idempotent GET requests if transient network glitch or connection reset occurs
    if (config && config.method === 'get' && !config._retry && (error.code === 'ERR_NETWORK' || !error.response)) {
      config._retry = true;
      return new Promise((resolve) => {
        setTimeout(() => resolve(apiClient(config)), 500);
      });
    }

    const status = error.response?.status || 500;
    const errorCode = error.response?.data?.error?.code || 'NETWORK_ERROR';
    const errorMessage = error.response?.data?.error?.message || error.message || 'Network request failed';

    // If session expired or account deactivated on an authenticated endpoint, clear credentials
    const reqUrl = error.config?.url || '';
    const isAuthPublicEndpoint =
      reqUrl.includes('/auth/login') ||
      reqUrl.includes('/auth/register') ||
      reqUrl.includes('/auth/forgot-password') ||
      reqUrl.includes('/auth/verify-reset-code');

    const isSessionInvalid =
      !isAuthPublicEndpoint &&
      (status === 401 ||
        (status === 403 &&
          ['ACCOUNT_SUSPENDED', 'ACCOUNT_INACTIVE', 'ACCOUNT_DEACTIVATED'].includes(errorCode)));

    if (isSessionInvalid) {
      setAuthToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sims-session-expired'));
      }
    }

    const customError = new Error(errorMessage);
    customError.code = errorCode;
    customError.status = status;
    customError.details = error.response?.data?.error?.details || [];
    customError.response = error.response;

    return Promise.reject(customError);
  }
);

export default apiClient;
