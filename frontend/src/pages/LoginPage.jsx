import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Key,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Building2,
  Users,
  ArrowLeft,
  Brain,
  CalendarCheck,
  Award,
  MessageSquare,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import SimsLogo from '../components/common/SimsLogo';
import GoogleSignInButton from '../components/common/GoogleSignInButton';
import authService from '../services/authService';

export const LoginPage = () => {
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('student');

  // Forgot password drawer states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const fillDemoRole = (role) => {
    setActiveTab(role);
    if (role === 'student') {
      setEmail('student@sims.edu');
      setPassword('Student@123');
    } else if (role === 'company') {
      setEmail('company@sims.edu');
      setPassword('Company@123');
    } else if (role === 'mentor') {
      setEmail('mentor@sims.edu');
      setPassword('Mentor@123');
    }
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Invalid email or password.');
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
      setForgotMsg(res.message || 'Reset instructions have been dispatched.');
    } catch (err) {
      setForgotMsg(err.message || 'Failed to request reset instructions.');
    } finally {
      setForgotLoading(false);
    }
  };

  const platformHighlights = [
    {
      icon: Brain,
      title: 'AI Resume Screening & Fit Radar',
      desc: 'Automatic parsing and semantic candidate scoring against industry job criteria.',
      badge: 'Smart AI',
    },
    {
      icon: CalendarCheck,
      title: 'Daily Attendance & Work Milestones',
      desc: 'Structured check-in timestamps with supervisor validation and review logs.',
      badge: 'Real-Time',
    },
    {
      icon: Award,
      title: 'Cryptographic Digital Certificates',
      desc: 'Tamper-proof completion credentials with dynamic QR code public verification.',
      badge: 'Verifiable',
    },
    {
      icon: MessageSquare,
      title: 'Live Collaboration & Mentor Chat',
      desc: 'Direct WebSocket communication connecting interns with designated faculty guides.',
      badge: 'Socket.IO',
    },
  ];

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-[#12090d]">
      {/* LEFT SIDE: Rich Info About the Application */}
      <div className="lg:col-span-6 xl:col-span-5 relative overflow-hidden bg-gradient-to-br from-[#2a0e18] via-[#1d0a11] to-[#120509] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-champagne-400/20 shadow-2xl">
        {/* Ambient Decorative Lighting */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 bg-burgundy-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 bg-champagne-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header & Back to Home */}
        <div className="relative z-10 space-y-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-champagne-200/80 hover:text-champagne-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Public Home</span>
          </Link>

          <div className="flex items-center gap-3">
            <SimsLogo size="md" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne-300/15 border border-champagne-400/30 text-[11px] font-bold text-champagne-200">
              <Sparkles className="w-3.5 h-3.5 text-champagne-300 animate-pulse" />
              <span>Smart Internship Governance Platform</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              Transforming College Internships into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-champagne-200 to-champagne-400">
                Verified Career Milestones
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-md">
              A unified digital ecosystem bridging the gap between higher education institutions, industry mentors,
              and aspiring students through transparent, auditable workflows.
            </p>
          </div>

          {/* 4 Feature Highlights */}
          <div className="space-y-3.5 pt-2">
            {platformHighlights.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-champagne-400/40 transition-all duration-200 flex items-start gap-3.5 group"
                >
                  <div className="p-2 rounded-xl bg-gradient-to-br from-burgundy-800 to-burgundy-950 text-champagne-300 border border-champagne-400/30 shrink-0 group-hover:scale-105 transition-transform">
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

        {/* Bottom Security Credentials Note */}
        <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-champagne-400 shrink-0" />
            <span>256-bit TLS Encrypted Session</span>
          </div>
          <span>ISO/IEC 27001 Compliant</span>
        </div>
      </div>

      {/* RIGHT SIDE: User Credentials Login Form */}
      <div className="lg:col-span-6 xl:col-span-7 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#fcfaf7] dark:bg-[#150d11]">
        <div className="w-full max-w-md space-y-5">
          {/* Form Header */}
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne-100 dark:bg-warmdark-800 text-burgundy-900 dark:text-champagne-300 text-xs font-bold border border-champagne-300 dark:border-stone-700">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>User & Student Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
              Sign In to Your Workspace
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Select your role or enter your registered account credentials below.
            </p>
          </div>

          {/* Admin Portal Switcher Banner */}
          <div className="p-3 rounded-2xl bg-burgundy-50 dark:bg-burgundy-950/60 border border-burgundy-200/90 dark:border-burgundy-900/60 flex items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 text-burgundy-900 dark:text-champagne-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-burgundy-700 dark:text-champagne-400 shrink-0" />
              <span>Are you a University Administrator?</span>
            </div>
            <Link
              to="/admin/login"
              id="switch-to-admin-login-link"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold text-champagne-100 bg-burgundy-900 hover:bg-burgundy-800 transition-colors shrink-0 shadow-xs"
            >
              <span>Admin Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Credentials Card */}
          <Card className="shadow-lg border-champagne-200/90 dark:border-burgundy-900/60 bg-white dark:bg-[#1a1114]">
            <CardContent className="p-6 sm:p-7">
              {(formError || authError) && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{formError || authError}</span>
                </div>
              )}

              {/* Role Demo Quick Switchers */}
              <div className="space-y-1.5 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                  Quick Role Auto-Fill:
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-champagne-100/70 dark:bg-warmdark-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => fillDemoRole('student')}
                    className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'student'
                        ? 'bg-white dark:bg-[#25171c] text-burgundy-800 dark:text-champagne-300 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoRole('company')}
                    className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'company'
                        ? 'bg-white dark:bg-[#25171c] text-burgundy-800 dark:text-champagne-300 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Employer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoRole('mentor')}
                    className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'mentor'
                        ? 'bg-white dark:bg-[#25171c] text-burgundy-800 dark:text-champagne-300 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Mentor</span>
                  </button>
                </div>
              </div>

              {!showForgot ? (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <Input
                    label="Registered Email Address"
                    type="email"
                    icon={Mail}
                    placeholder="name@university.edu or name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />

                  <Input
                    label="Password"
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
                        className="rounded text-burgundy-600 focus:ring-burgundy-500 border-stone-300 dark:border-stone-700"
                      />
                      <span>Remember session</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
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
                    className="w-full font-bold shadow-md shadow-burgundy-950/20 bg-gradient-to-r from-burgundy-700 to-burgundy-850 hover:bg-burgundy-800 text-white py-2.5"
                  >
                    Sign In to Portal
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
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      Password Reset Request
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      Enter your account email to receive a secure recovery code.
                    </p>
                  </div>

                  <Input
                    label="Registered Email"
                    type="email"
                    icon={Mail}
                    placeholder="name@domain.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />

                  {forgotMsg && (
                    <div className="p-3 rounded-xl bg-champagne-100 dark:bg-burgundy-950/30 border border-champagne-300 text-xs text-burgundy-900 dark:text-champagne-300 flex items-start gap-2">
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
                      Back to Login
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={forgotLoading}
                    >
                      Submit Request
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-4 pt-3.5 border-t border-champagne-200 dark:border-stone-800 text-center text-xs text-stone-500 dark:text-stone-400">
                <span>Don't have an account yet? </span>
                <Link
                  to="/register"
                  className="font-bold text-burgundy-700 dark:text-champagne-400 hover:underline"
                >
                  Register as Student or Company
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="py-2.5 px-3 rounded-xl bg-white/70 dark:bg-[#0d1424]/60 border border-champagne-200/80 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-center gap-2 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Server-side authentication • Session tokens encrypted with HS256</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
