import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('sims_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('sims_auth_token'));
  const [isLoading, setIsLoading] = useState(() => {
    return Boolean(localStorage.getItem('sims_auth_token') && !localStorage.getItem('sims_auth_user'));
  });
  const [error, setError] = useState(null);

  // Restore authenticated session on initial load
  const loadUser = useCallback(async () => {
    const savedToken = localStorage.getItem('sims_auth_token');
    if (!savedToken) {
      setAuthToken(null);
      localStorage.removeItem('sims_auth_user');
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setAuthToken(savedToken);
      const response = await authService.getMe();
      if (response?.data?.user) {
        setUser(response.data.user);
        try {
          localStorage.setItem('sims_auth_user', JSON.stringify(response.data.user));
        } catch {
          // Ignore storage quota error
        }
        setToken(savedToken);
      } else {
        setAuthToken(null);
        localStorage.removeItem('sims_auth_user');
        setUser(null);
        setToken(null);
      }
    } catch {
      // Stale or invalid token
      setAuthToken(null);
      localStorage.removeItem('sims_auth_user');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();

    // Listen for automatic token expiration from axios interceptor
    const handleExpired = () => {
      setAuthToken(null);
      localStorage.removeItem('sims_auth_user');
      setUser(null);
      setToken(null);
      setError('Your session has expired. Please sign in again.');
    };

    window.addEventListener('sims-session-expired', handleExpired);
    return () => window.removeEventListener('sims-session-expired', handleExpired);
  }, [loadUser]);

  // Set automatic client-side logout timer based on token expiration
  useEffect(() => {
    if (!token) return;

    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
          base64 += '=';
        }
        const payload = JSON.parse(atob(base64));
        if (payload?.exp) {
          const expiresAtMs = payload.exp * 1000;
          const delay = expiresAtMs - Date.now();
          if (delay <= 0) {
            window.dispatchEvent(new Event('sims-session-expired'));
            return;
          }
          const timer = setTimeout(() => {
            window.dispatchEvent(new Event('sims-session-expired'));
          }, delay);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      // Ignore parse errors for mock or non-standard tokens
    }
  }, [token]);

  const login = async ({ email, password }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login({ email, password });
      if (response?.requiresTwoFactor) {
        return {
          requiresTwoFactor: true,
          email: response.email,
          message: response.message,
        };
      }
      const { user: authUser, token: authToken } = response.data;

      setAuthToken(authToken);
      setUser(authUser);
      try {
        localStorage.setItem('sims_auth_user', JSON.stringify(authUser));
      } catch {
        // Ignore storage write error
      }
      setToken(authToken);
      return { success: true, user: authUser };
    } catch (err) {
      setError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const completeTwoFactor = async ({ email, code }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.verifyTwoFactor({ email, code });
      const { user: authUser, token: authToken } = response.data;

      setAuthToken(authToken);
      setUser(authUser);
      try {
        localStorage.setItem('sims_auth_user', JSON.stringify(authUser));
      } catch {
        // Ignore storage write error
      }
      setToken(authToken);
      return { success: true, user: authUser };
    } catch (err) {
      setError(err.message || 'Two-step verification failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(userData);
      const { user: authUser, token: authToken } = response.data;

      setAuthToken(authToken);
      setUser(authUser);
      try {
        localStorage.setItem('sims_auth_user', JSON.stringify(authUser));
      } catch {
        // Ignore storage write error
      }
      setToken(authToken);
      return { success: true, user: authUser };
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async ({ credential, role }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.googleLogin({ credential, role });
      const { user: authUser, token: authToken } = response.data;

      setAuthToken(authToken);
      setUser(authUser);
      try {
        localStorage.setItem('sims_auth_user', JSON.stringify(authUser));
      } catch {
        // Ignore storage write error
      }
      setToken(authToken);
      return { success: true, user: authUser };
    } catch (err) {
      setError(err.message || 'Google authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setAuthToken(null);
      localStorage.removeItem('sims_auth_user');
      setUser(null);
      setToken(null);
      setError(null);
    }
  };

  const clearError = () => setError(null);

  const updateUserState = (updatedUser) => {
    if (!updatedUser) return;
    setUser((prev) => {
      const nextUser = prev ? { ...prev, ...updatedUser } : updatedUser;
      try {
        localStorage.setItem('sims_auth_user', JSON.stringify(nextUser));
      } catch {
        // Ignore storage write error
      }
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        completeTwoFactor,
        loginWithGoogle,
        register,
        logout,
        clearError,
        reloadUser: loadUser,
        updateUserState,
        updateUser: updateUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
