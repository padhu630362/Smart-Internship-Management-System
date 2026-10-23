import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, signInWithPopup } from '../../config/firebase';
import { apiClient } from '../../api/client';
import { getRoleDashboardRoute } from '../../utils/navigation';

export const GoogleSignInButton = ({
  role = 'student',
  onSuccess,
  onError,
  text = 'Sign in with Google',
  className = '',
}) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [clientId, setClientId] = useState(
    () => import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  );

  // Fetch clientId from backend if not present in Vite env
  useEffect(() => {
    let isMounted = true;
    if (!clientId) {
      apiClient
        .get('/auth/google/client-id')
        .then((res) => {
          if (isMounted && res.data?.data?.clientId) {
            setClientId(res.data.data.clientId);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [clientId]);

  // Optional: Initialize Google Identity Services (GIS) One-Tap / ID Token listener
  useEffect(() => {
    const effectiveClientId =
      clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

    if (typeof window !== 'undefined' && window.google?.accounts?.id && effectiveClientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: effectiveClientId,
          callback: async (response) => {
            if (response?.credential) {
              setLoading(true);
              setErrorMsg('');
              try {
                const res = await loginWithGoogle({
                  credential: response.credential,
                  role,
                });
                if (onSuccess) onSuccess(res);
                const targetRoute = getRoleDashboardRoute(res?.user?.role || role);
                navigate(targetRoute, { replace: true });
              } catch (err) {
                const msg =
                  err.response?.data?.error?.message ||
                  err.response?.data?.message ||
                  err.message ||
                  'Google authentication failed.';
                setErrorMsg(msg);
                if (onError) onError(err);
              } finally {
                setLoading(false);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } catch (initErr) {
        // Ignore GIS One Tap init warning
      }
    }
  }, [clientId, role, loginWithGoogle, onSuccess, onError, navigate]);

  const handleClick = async () => {
    setLoading(true);
    setErrorMsg('');

    const effectiveClientId =
      clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

    // Strategy 1: Google Identity Services (GIS) OAuth Token Client
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2 && effectiveClientId) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: effectiveClientId,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setLoading(false);
              if (
                tokenResponse.error !== 'popup_closed_by_user' &&
                tokenResponse.error !== 'access_denied'
              ) {
                setErrorMsg(
                  tokenResponse.error_description ||
                    `Google sign-in error: ${tokenResponse.error}`
                );
              }
              return;
            }

            try {
              let profile = {};
              try {
                const userRes = await fetch(
                  'https://www.googleapis.com/oauth2/v3/userinfo',
                  {
                    headers: {
                      Authorization: `Bearer ${tokenResponse.access_token}`,
                    },
                  }
                );
                if (userRes.ok) {
                  profile = await userRes.json();
                }
              } catch {
                // Ignore userinfo fetch failure
              }

              const res = await loginWithGoogle({
                credential: tokenResponse.access_token,
                role,
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
              });

              if (onSuccess) onSuccess(res);
              const targetRoute = getRoleDashboardRoute(res?.user?.role || role);
              navigate(targetRoute, { replace: true });
            } catch (err) {
              const msg =
                err.response?.data?.error?.message ||
                err.response?.data?.message ||
                err.message ||
                'Google authentication failed.';
              setErrorMsg(msg);
              if (onError) onError(err);
            } finally {
              setLoading(false);
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (gisErr) {
        console.warn('Google Identity Services token client error:', gisErr);
        // Fall through to Firebase strategy
      }
    }

    // Strategy 2: Firebase Google Popup Fallback
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const res = await loginWithGoogle({
        credential: idToken,
        role,
        email: user.email,
        name: user.displayName || user.email?.split('@')[0] || 'Google User',
        picture: user.photoURL || '',
      });

      if (onSuccess) onSuccess(res);
      const targetRoute = getRoleDashboardRoute(res?.user?.role || role);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        setLoading(false);
        return;
      }

      console.error('Google Authentication Error:', err);
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Google authentication failed. Please try again.';
      setErrorMsg(message);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-champagne-300 dark:border-warmdark-700 bg-white dark:bg-warmdark-850 hover:bg-champagne-50/70 dark:hover:bg-warmdark-800 text-stone-800 dark:text-stone-100 font-medium text-xs sm:text-sm shadow-2xs transition-all duration-150 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-burgundy-600 dark:text-champagne-400" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{loading ? 'Connecting with Google...' : text}</span>
      </button>

      {errorMsg && (
        <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-700 dark:text-red-300 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default GoogleSignInButton;
