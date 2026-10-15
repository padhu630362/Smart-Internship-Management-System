import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  Key,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Server,
  Layers,
  ArrowRight,
  UserCheck,
  FileCheck2,
  BarChart3,
  Sliders,
  Database,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import SimsLogo from '../components/common/SimsLogo';
import authService from '../services/authService';

export const AdminLoginPage = () => {
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Forgot password drawer states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const fillCredentials = (role) => {
    if (role === 'admin') {
      setEmail('admin@sims.edu');
      setPassword('Admin@123');
    } else if (role === 'coordinator') {
      setEmail('coordinator@sims.edu');
      setPassword('Coordinator@123');
    }
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please provide institutional email address and administrative password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login({ email, password });
      const userRole = result?.user?.role;
      if (userRole === 'admin') {
        navigate('/admin/users', { replace: true });
      } else if (userRole === 'coordinator') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setFormError(err.message || 'Invalid administrative credentials or unauthorized role.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMsg('');
    try {
      const res = await authService.forgotPassword(forgotEmail);
      setForgotMsg(res.message || 'Security reset instructions have been dispatched.');
    } catch (err) {
      setForgotMsg(err.message || 'Failed to dispatch reset instructions.');
    } finally {
      setForgotLoading(false);
    }
  };

  const governancePillars = [
    {
      icon: Sliders,
      title: 'Allocation & Quota Engine',
      desc: 'Systematic distribution of verified students across accredited host companies.',
      badge: 'Automated',
    },
    {
      icon: BarChart3,
      title: 'Accreditation Reports & CSV Export',
      desc: 'Real-time cohort aggregations formatted for regulatory and board inspections.',
      badge: 'Audit Ready',
    },
    {
      icon: Database,
      title: 'Cryptographic Audit Trails',
      desc: 'Immutable ledger logging every role transition, attendance edit, and approval.',
      badge: 'Ledger',
    },
    {
      icon: ShieldCheck,
      title: 'Multi-Tier Role Boundaries',
      desc: 'Granular permissions preventing cross-organization and cross-role privilege leaks.',
      badge: 'Strict RBAC',
    },
  ];

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-[#12090d]">
      {/* LEFT SIDE: Institutional Administration Application Info */}
      <div className="lg:col-span-6 xl:col-span-5 relative overflow-hidden bg-gradient-to-br from-[#240812] via-[#17050b] to-[#0c0205] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-burgundy-800/40 shadow-2xl">
        {/* Ambient Radial Lights */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-burgundy-700/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-champagne-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header & Application Info */}
        <div className="relative z-10 space-y-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-champagne-300/80 hover:text-champagne-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Public Home</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-burgundy-800 to-burgundy-950 border border-champagne-400/40 flex items-center justify-center shadow-lg shadow-burgundy-950/40 shrink-0">
              <ShieldCheck className="w-7 h-7 text-champagne-300" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-white block">
                SIM Institutional Console
              </span>
              <span className="text-[10px] text-champagne-300 font-medium">
                Higher Education Directorate Level
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne-400/15 border border-champagne-400/30 text-[11px] font-bold text-champagne-200">
              <Sparkles className="w-3.5 h-3.5 text-champagne-300 animate-pulse" />
              <span>Restricted Governance Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              Centralized Academic & Industry{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-champagne-200 to-champagne-400">
                Governance Console
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-md">
              Secure institutional administrative center for University System Administrators and Academic Coordinators
              to manage student allocations, evaluate attendance records, and generate accredited reports.
            </p>
          </div>

          {/* 4 Governance Pillars */}
          <div className="space-y-3 pt-2">
            {governancePillars.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-champagne-400/40 transition-all duration-200 flex items-start gap-3.5 group"
                >
                  <div className="p-2 rounded-xl bg-gradient-to-br from-burgundy-900 to-burgundy-950 text-champagne-300 border border-champagne-400/30 shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white group-hover:text-champagne-200 transition-colors">
                        {item.title}
                      </h4>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-champagne-400/20 text-champagne-300">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security Alert Footnote */}
        <div className="relative z-10 pt-6 mt-6 border-t border-white/10 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-champagne-300 font-semibold">
            <Lock className="w-3.5 h-3.5 text-champagne-400 shrink-0" />
            <span>Authorized Faculty & Administrator Zone Only</span>
          </div>
          <p className="text-[10px] text-stone-400 leading-normal">
            Unauthorized access attempts are cryptographically timestamped and reported to the institutional cyber security registry.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Admin Login Credentials Form */}
      <div className="lg:col-span-6 xl:col-span-7 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#fcfaf7] dark:bg-[#150d11]">
        <div className="w-full max-w-md space-y-5">
          {/* Header */}
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-burgundy-50 dark:bg-burgundy-950/80 text-burgundy-900 dark:text-champagne-300 text-xs font-bold border border-burgundy-200 dark:border-burgundy-800">
              <ShieldCheck className="w-3.5 h-3.5 text-burgundy-700 dark:text-champagne-400" />
              <span>Administrative Gateway</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
              Institutional Admin Login
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Enter your elevated faculty or administrator security credentials.
            </p>
          </div>

          {/* Institutional Security Notice */}
          <div className="p-3 rounded-2xl bg-champagne-100/80 dark:bg-burgundy-950/60 border border-champagne-300 dark:border-burgundy-900/60 text-xs text-burgundy-900 dark:text-champagne-200 flex items-start gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-burgundy-700 dark:text-champagne-400" />
            <div className="leading-snug">
              <span className="font-bold">Security Notice:</span> Access to allocation matrices and audit logs requires active 2FA or verified administrative token.
            </div>
          </div>

          {/* Form Card */}
          <Card className="shadow-xl border-champagne-300/80 dark:border-burgundy-900/70 bg-white dark:bg-[#1a1114]">
            <CardContent className="p-6 sm:p-7">
              {(formError || authError) && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{formError || authError}</span>
                </div>
              )}

              {/* Quick Demo Credentials Fillers */}
              <div className="p-3 rounded-xl bg-champagne-50 dark:bg-warmdark-800/80 border border-champagne-200 dark:border-stone-750 space-y-2 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-champagne-400 block">
                  Quick Demo Credentials Fill:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fillCredentials('admin')}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-white dark:bg-warmdark-700 border border-champagne-300 dark:border-stone-600 text-burgundy-900 dark:text-champagne-300 hover:bg-champagne-100 hover:border-burgundy-500 transition-colors shadow-2xs"
                  >
                    Admin Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('coordinator')}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-white dark:bg-warmdark-700 border border-champagne-300 dark:border-stone-600 text-burgundy-900 dark:text-champagne-300 hover:bg-champagne-100 hover:border-burgundy-500 transition-colors shadow-2xs"
                  >
                    Coordinator Demo
                  </button>
                </div>
              </div>

              {!showForgot ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Institutional Email Address"
                    type="email"
                    icon={Mail}
                    placeholder="admin@sims.edu or coordinator@sims.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />

                  <Input
                    label="Administrative Security Password"
                    type="password"
                    icon={Key}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <div className="flex items-center justify-between text-xs text-stone-500 pt-0.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded text-burgundy-700 focus:ring-burgundy-500 border-stone-300 dark:border-stone-700"
                      />
                      <span>Hardware token remembered</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-burgundy-700 dark:text-champagne-400 hover:underline font-semibold"
                    >
                      Forgot access key?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    icon={ShieldCheck}
                    isLoading={submitting}
                    className="w-full font-bold shadow-md shadow-burgundy-950/20 bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-950 hover:from-burgundy-800 hover:to-burgundy-900 text-champagne-100 py-2.5"
                  >
                    Verify Credentials & Authorize
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      Administrative Recovery Protocol
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      Provide your institutional faculty/administrator email. A cryptographic recovery token will be dispatched.
                    </p>
                  </div>

                  <Input
                    label="Registered Administrator Email"
                    type="email"
                    icon={Mail}
                    placeholder="admin@sims.edu"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />

                  {forgotMsg && (
                    <div className="p-3 rounded-xl bg-champagne-100/80 dark:bg-burgundy-950/40 border border-champagne-300 text-xs text-burgundy-900 dark:text-champagne-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{forgotMsg}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForgot(false)}
                    >
                      Back to Admin Login
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={forgotLoading}
                    >
                      Send Recovery Token
                    </Button>
                  </div>
                </form>
              )}

              {/* Switch to User Login */}
              <div className="mt-5 pt-4 border-t border-champagne-200/80 dark:border-stone-800 text-center space-y-2">
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  Not an institutional administrator?
                </div>
                <Link
                  to="/login"
                  id="switch-to-user-login-btn"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-burgundy-800 dark:text-champagne-300 bg-champagne-100/60 dark:bg-warmdark-800 hover:bg-champagne-200 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Switch to Student, Mentor & Company Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Audit Footnote */}
          <div className="text-center text-[11px] text-stone-400 dark:text-stone-500">
            SIM Governance Engine • ISO/IEC 27001 & RBAC Cryptographic Audit Enforced
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
