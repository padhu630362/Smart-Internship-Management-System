import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sims_auth_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on initial load
  const loadUser = useCallback(async () => {
    const savedToken = localStorage.getItem('sims_auth_token');
    if (!savedToken) {
      setAuthToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setAuthToken(savedToken);
      const response = await authService.getMe();
      if (response?.data?.user) {
        setUser(response.data.user);
        setToken(savedToken);
      } else {
        setAuthToken(null);
        setUser(null);
        setToken(null);
      }
    } catch {
      // Stale or invalid token
      setAuthToken(null);
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
      setUser(null);
      setToken(null);
      setError('Your session has expired. Please sign in again.');
    };

    window.addEventListener('sims-session-expired', handleExpired);
    return () => window.removeEventListener('sims-session-expired', handleExpired);
  }, [loadUser]);

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
      setUser(null);
      setToken(null);
      setError(null);
    }
  };

  const clearError = () => setError(null);

  const updateUserState = (updatedUser) => {
    if (!updatedUser) return;
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
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
