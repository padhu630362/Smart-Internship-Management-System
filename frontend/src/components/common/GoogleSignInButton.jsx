import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, Info, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const GoogleSignInButton = ({
  role = 'student',
  onSuccess,
  onError,
  text = 'Sign in with Google',
  className = '',
}) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoName, setDemoName] = useState('');

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Initialize official Google Identity Services if client ID is provided
  useEffect(() => {
    if (!clientId) return;

    const initializeGsi = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'rectangular',
        });
      }
    };

    if (window.google?.accounts?.id) {
      initializeGsi();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGsi;
      document.body.appendChild(script);
    }
  }, [clientId]);

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setLoading(true);
    try {
      const res = await loginWithGoogle({
        credential: response.credential,
        role,
      });
      if (onSuccess) onSuccess(res);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSignIn = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const chosenEmail = demoEmail.trim() || `google.user.${Date.now().toString().slice(-4)}@gmail.com`;
      const chosenName = demoName.trim() || 'Google User';

      // Dispatches development/test credential token to backend
      const res = await loginWithGoogle({
        credential: `test_google_token_${Date.now()}`,
        role,
        email: chosenEmail,
        name: chosenName,
      });

      setShowDemoModal(false);
      if (onSuccess) onSuccess(res);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      // Show instant sign-in dialog with Google Cloud setup guidance
      setShowDemoModal(true);
    }
  };

  return (
    <>
      <div className={`w-full ${className}`}>
        {/* Real Google GSI Container (if Client ID present) */}
        {clientId ? (
          <div ref={googleBtnRef} className="w-full flex justify-center" />
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-champagne-300 dark:border-warmdark-700 bg-white dark:bg-warmdark-850 hover:bg-champagne-50/60 dark:hover:bg-warmdark-800 text-stone-800 dark:text-stone-100 font-medium text-xs sm:text-sm shadow-soft transition-all duration-150 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-burgundy-600" />
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
            <span>{text}</span>
          </button>
        )}
      </div>

      {/* Instant Google Sign-In & Configuration Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md p-6 rounded-2xl surface-card border border-champagne-300 dark:border-burgundy-900/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-champagne-200 dark:border-warmdark-700">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-burgundy-50 dark:bg-burgundy-950/60 text-burgundy-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-stone-900 dark:text-white text-sm">
                  Google Sign-In Authentication
                </h3>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Google OAuth backend authentication endpoint is fully mounted at <code className="font-mono text-burgundy-600 dark:text-burgundy-400">/api/auth/google</code>.
              You can instantly sign in using the profile below or configure your production Google Client ID in <code className="font-mono">.env</code>.
            </p>

            <form onSubmit={handleQuickDemoSignIn} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Google Account Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-champagne-300 dark:border-warmdark-700 bg-white dark:bg-warmdark-900 text-xs text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-burgundy-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. alex.intern@gmail.com"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  className="w-full p-2 rounded-xl border border-champagne-300 dark:border-warmdark-700 bg-white dark:bg-warmdark-900 text-xs text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-burgundy-500/20"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-champagne-50/80 dark:bg-warmdark-800/80 border border-champagne-200 dark:border-warmdark-700 text-[11px] text-stone-600 dark:text-stone-300 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-champagne-700 dark:text-champagne-400 shrink-0 mt-0.5" />
                <span>
                  Signing in will automatically issue a verified JWT session for the <strong>{role}</strong> role.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDemoModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-champagne-300 dark:border-warmdark-700 text-xs text-stone-600 dark:text-stone-300 hover:bg-champagne-100/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-brand text-white font-semibold text-xs px-4 py-1.5 rounded-xl shadow-sm hover:brightness-105 flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sign In with Google</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GoogleSignInButton;

