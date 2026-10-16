import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Key,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import SimsLogo from '../components/common/SimsLogo';
import GoogleSignInButton from '../components/common/GoogleSignInButton';
import authService from '../services/authService';
import ForgotPasswordModal from '../components/common/ForgotPasswordModal';
import { getRoleDashboardRoute } from '../utils/navigation';

export const LoginPage = () => {
  const { user, isAuthenticated, login, completeTwoFactor, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Login form state - strictly empty on mount
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const userInteractedRef = useRef(false);

  // Two-Step Verification state for Login
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorCooldown, setTwoFactorCooldown] = useState(0);
  const [twoFactorNotice, setTwoFactorNotice] = useState('');

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);

  const from = location.state?.from?.pathname;

  // Clear email and password on initial mount and prevent browser autofill populating fields
  useEffect(() => {
    setEmail('');
    setPassword('');
    userInteractedRef.current = false;

    // Defend against browsers that delay-populate password fields 50-300ms after DOM load
    const timer1 = setTimeout(() => {
      if (!userInteractedRef.current) {
        setEmail('');
        setPassword('');
      }
    }, 60);

    const timer2 = setTimeout(() => {
      if (!userInteractedRef.current) {
        setEmail('');
        setPassword('');
      }
    }, 280);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Automatically redirect already authenticated users to their verified dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const targetRoute =
        from && from !== '/login' && from !== '/register' && from !== '/' && from !== '/admin/login'
          ? from
          : getRoleDashboardRoute(user.role);
      navigate(targetRoute, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  // Two-factor cooldown countdown timer
  useEffect(() => {
    if (twoFactorCooldown <= 0) return;
    const interval = setInterval(() => {
      setTwoFactorCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [twoFactorCooldown]);

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login({ email, password });
      if (res?.requiresTwoFactor) {
        setTwoFactorRequired(true);
        setTwoFactorEmail(res.email || email);
        setTwoFactorCode('');
        setTwoFactorCooldown(60);
        setTwoFactorNotice(res.message || `A 6-digit verification code has been dispatched to ${res.email || email}.`);
        return;
      }
      const targetRoute =
        from && from !== '/login' && from !== '/register' && from !== '/' && from !== '/admin/login'
          ? from
          : getRoleDashboardRoute(res?.user?.role);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      setFormError(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Two-Step Verification code verification
  const handleVerifyTwoFactor = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.trim().length !== 6) {
      setFormError('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await completeTwoFactor({ email: twoFactorEmail, code: twoFactorCode.trim() });
      const targetRoute =
        from && from !== '/login' && from !== '/register' && from !== '/' && from !== '/admin/login'
          ? from
          : getRoleDashboardRoute(res?.user?.role);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      setFormError(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Invalid or expired verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend Two-Step Verification code
  const handleResendTwoFactor = async () => {
    if (twoFactorCooldown > 0 || submitting) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await authService.resendTwoFactor(twoFactorEmail);
      setTwoFactorNotice(res.message || 'A new 6-digit verification code has been dispatched to your email.');
      setTwoFactorCooldown(60);
      setTwoFactorCode('');
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to resend verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-[#12090d] overflow-hidden">
      {/* LEFT SIDE: Visual Brand Showcase */}
      <div className="hidden lg:flex lg:col-span-5 relative overflow-hidden bg-stone-900 text-white p-8 lg:p-12 flex-col justify-between select-none">
        {/* Background High-Quality Professional Photo with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1800&q=85')`,
          }}
        />
        {/* Refined Dark Gradient Overlay with Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#18060f] via-[#18060f]/80 to-[#18060f]/45 backdrop-blur-[0.5px]" />
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-burgundy-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-80 h-80 bg-champagne-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Simple Return to Home */}
        <div className="relative z-10 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-champagne-200/90 hover:text-white transition-colors bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-champagne-300">
            <Sparkles className="w-3 h-3 text-champagne-300 animate-pulse" />
            <span>Verified Portal</span>
          </div>
        </div>

        {/* Bottom Content: Clean InternHub Branding & Live Metrics */}
        <div className="relative z-10 space-y-5">
          <div className="inline-block">
            <SimsLogo size="lg" inverted />
          </div>
          <div className="space-y-2.5">
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight font-display">
              Launch Your Career with{' '}
              <span className="text-white font-black">
                Intern<span className="text-champagne-300">Hub</span>
              </span>
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed max-w-sm font-sans">
              The unified platform connecting ambitious students, accredited mentors, and top employers.
            </p>
          </div>

          {/* Social Proof / Live Platform Metrics */}
          <div className="pt-3 flex items-center gap-5 border-t border-white/15 text-xs text-stone-300">
            <div>
              <div className="text-lg font-black text-white font-display">500+</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Active Partners</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <div className="text-lg font-black text-white font-display">98.4%</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Placement Rate</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <div className="text-lg font-black text-white font-display">100%</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Verified Records</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Compact, Visually Balanced Login Workspace */}
      <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 bg-[#fcfaf7] dark:bg-[#150d11] overflow-y-auto">
        <div className="w-full max-w-md space-y-5">
          {/* Mobile Home Link */}
          <div className="lg:hidden flex items-center justify-between pb-1">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-burgundy-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Home</span>
            </Link>
            <SimsLogo size="sm" />
          </div>

          {/* Form Header */}
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
              Sign In to InternHub
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Enter your credentials to access your verified dashboard.
            </p>
          </div>

          {/* Credentials Card */}
          <Card className="shadow-lg border-champagne-200/90 dark:border-burgundy-900/60 bg-white dark:bg-[#1a1114]">
            <CardContent className="p-6">
              {/* Form Feedback Alerts */}
              {(formError || authError) && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{formError || authError}</span>
                </div>
              )}

              {twoFactorRequired ? (
                /* Two-Step Verification (2FA) View */
                <div className="space-y-4 animate-in fade-in">
                  <div className="text-center space-y-2 pb-1">
                    <div className="w-12 h-12 rounded-2xl bg-burgundy-50 dark:bg-burgundy-950/50 border border-burgundy-200 dark:border-burgundy-800 text-burgundy-700 dark:text-champagne-400 mx-auto flex items-center justify-center shadow-xs">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-stone-900 dark:text-white tracking-tight font-display">
                      Two-Step Verification
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed max-w-sm mx-auto">
                      A 6-digit verification code has been dispatched in real time to your personal email:
                    </p>
                    <div className="inline-block px-3 py-1 rounded-full bg-champagne-100/70 dark:bg-stone-800 border border-champagne-300 dark:border-stone-700 font-mono text-xs font-bold text-burgundy-900 dark:text-champagne-300">
                      {twoFactorEmail}
                    </div>
                  </div>

                  {twoFactorNotice && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{twoFactorNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 text-center">
                        Enter 6-Digit Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-burgundy-500/20 focus:border-burgundy-600 shadow-inner"
                        autoFocus
                        required
                      />
                      <p className="text-[11px] text-stone-500 text-center">
                        Code expires in 10 minutes. Please check your inbox and spam folder.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={submitting}
                      disabled={submitting || twoFactorCode.length !== 6}
                      className="w-full font-bold shadow-md bg-gradient-to-r from-burgundy-700 to-burgundy-850 hover:bg-burgundy-800 text-white py-2.5"
                    >
                      Verify & Sign In
                    </Button>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={twoFactorCooldown > 0 || submitting}
                        onClick={handleResendTwoFactor}
                        className="text-xs font-semibold text-burgundy-700 dark:text-champagne-400 hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
                        <span>
                          {twoFactorCooldown > 0 ? `Resend code in ${twoFactorCooldown}s` : 'Resend code'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorRequired(false);
                          setFormError('');
                        }}
                        className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {/* Login Form */}
                  <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-3.5">
                    {/* Hidden decoy fields to divert aggressive browser credential autofill */}
                    <input
                      type="text"
                      name="prevent_autofill_user"
                      tabIndex={-1}
                      aria-hidden="true"
                      className="sr-only absolute -left-[9999px]"
                      autoComplete="off"
                      readOnly
                    />
                    <input
                      type="password"
                      name="prevent_autofill_pwd"
                      tabIndex={-1}
                      aria-hidden="true"
                      className="sr-only absolute -left-[9999px]"
                      autoComplete="new-password"
                      readOnly
                    />

                    <Input
                      label="Email Address"
                      type="email"
                      icon={Mail}
                      placeholder="name@university.edu or name@company.com"
                      value={email}
                      onChange={(e) => {
                        userInteractedRef.current = true;
                        setEmail(e.target.value);
                      }}
                      autoComplete="off"
                      name="internhub_login_email"
                      required
                    />

                    <Input
                      label="Password"
                      type="password"
                      icon={Key}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => {
                        userInteractedRef.current = true;
                        setPassword(e.target.value);
                      }}
                      autoComplete="new-password"
                      name="internhub_login_password"
                      required
                    />

                    <div className="flex items-center justify-between text-xs text-stone-500 pt-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded text-burgundy-600 focus:ring-burgundy-500 border-stone-300 dark:border-stone-700"
                        />
                        <span>Remember session</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-burgundy-700 dark:text-champagne-400 hover:underline font-semibold"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      icon={LogIn}
                      isLoading={submitting}
                      className="w-full font-bold shadow-md bg-gradient-to-r from-burgundy-700 to-burgundy-850 hover:bg-burgundy-800 text-white py-2.5"
                    >
                      Sign In
                    </Button>

                    <div className="relative my-2.5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-champagne-200 dark:border-warmdark-700" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-white dark:bg-[#1a1114] text-stone-500 font-medium">
                          or continue with
                        </span>
                      </div>
                    </div>

                    <GoogleSignInButton text="Sign in with Google" />
                  </form>
                </>
              )}

              {/* Bottom Register Link */}
              <div className="mt-4 pt-3.5 border-t border-champagne-200 dark:border-stone-800 text-center text-xs text-stone-500 dark:text-stone-400">
                <span>Don't have an account yet? </span>
                <Link
                  to="/register"
                  className="font-bold text-burgundy-700 dark:text-champagne-400 hover:underline"
                >
                  Sign Up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 6-DIGIT EMAIL VERIFICATION FORGOT PASSWORD MODAL */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
        onSuccess={(resetEmail) => {
          if (resetEmail) setEmail(resetEmail);
          setPassword('');
        }}
      />
    </div>
  );
};

export default LoginPage;
