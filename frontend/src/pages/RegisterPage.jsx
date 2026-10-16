import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Key,
  Building2,
  GraduationCap,
  Users,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import SimsLogo from '../components/common/SimsLogo';
import GoogleSignInButton from '../components/common/GoogleSignInButton';
import ForgotPasswordModal from '../components/common/ForgotPasswordModal';
import { getRoleDashboardRoute } from '../utils/navigation';

export const RegisterPage = () => {
  const { user, isAuthenticated, register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [extraField, setExtraField] = useState('');

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Automatically redirect already authenticated users to their verified dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleDashboardRoute(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name || name.trim().length < 2) {
      setFormError('Full name must be at least 2 characters long.');
      return;
    }

    if (!email || !email.includes('@')) {
      setFormError('Please provide a valid email address.');
      return;
    }

    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      setFormError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        profile:
          role === 'student'
            ? { studentDetails: { university: extraField } }
            : role === 'company'
            ? { companyDetails: { companyName: extraField } }
            : { mentorDetails: { companyName: extraField } },
      };

      const res = await register(payload);
      const targetRole = res?.user?.role || role;
      navigate(getRoleDashboardRoute(targetRole), { replace: true });
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please check your credentials.');
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
            backgroundImage: `url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1800&q=85')`,
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
            <span>Fast-Track Onboarding</span>
          </div>
        </div>

        {/* Bottom Content: Clean InternHub Branding */}
        <div className="relative z-10 space-y-5">
          <div className="inline-block">
            <SimsLogo size="lg" inverted />
          </div>
          <div className="space-y-2.5">
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight font-display">
              Start Your Journey with{' '}
              <span className="text-white font-black">
                Intern<span className="text-champagne-300">Hub</span>
              </span>
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed max-w-sm font-sans">
              Create your verified account to apply for real-time opportunities, collaborate with mentors, and earn accredited credentials.
            </p>
          </div>

          {/* Platform Pillars */}
          <div className="pt-3 flex items-center gap-5 border-t border-white/15 text-xs text-stone-300">
            <div>
              <div className="text-lg font-black text-white font-display">AI Fit</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Resume Match</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <div className="text-lg font-black text-white font-display">Real-Time</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Live Chat & Tasks</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <div className="text-lg font-black text-white font-display">Tamper-Proof</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">QR Credentials</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Compact, Visually Balanced Registration Workspace */}
      <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-center p-5 sm:p-8 lg:p-10 bg-[#fcfaf7] dark:bg-[#150d11] overflow-y-auto">
        <div className="w-full max-w-lg space-y-4">
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
              Create Your InternHub Account
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Join the internship management ecosystem as a Student, Employer, or Mentor.
            </p>
          </div>

          {/* Credentials Card */}
          <Card className="shadow-lg border-champagne-200/90 dark:border-burgundy-900/60 bg-white dark:bg-[#1a1114]">
            <CardContent className="p-5 sm:p-6">
              {formError && (
                <div className="mb-3.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">{formError}</span>
                    {formError.toLowerCase().includes('already exists') && (
                      <div className="mt-1 text-xs text-rose-600 dark:text-rose-300">
                        <span>Already registered? </span>
                        <Link to="/login" className="underline font-bold hover:text-rose-800 dark:hover:text-rose-100">
                          Sign In here
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Role Selection Tabs */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                    Select Your Role:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-champagne-100/70 dark:bg-warmdark-800 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        role === 'student'
                          ? 'bg-white dark:bg-[#25171c] text-burgundy-800 dark:text-champagne-300 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('company')}
                      className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        role === 'company'
                          ? 'bg-white dark:bg-[#25171c] text-burgundy-800 dark:text-champagne-300 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Employer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('mentor')}
                      className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        role === 'mentor'
                          ? 'bg-white dark:bg-[#25171c] text-burgundy-800 dark:text-champagne-300 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Mentor</span>
                    </button>
                  </div>
                </div>

                {/* Name & Email Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Input
                    label="Full Name"
                    type="text"
                    icon={User}
                    placeholder="e.g. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    icon={Mail}
                    placeholder={role === 'student' ? 'student@university.edu' : 'hiring@company.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Organization / University */}
                <Input
                  label={role === 'student' ? 'College / University Name' : 'Company / Organization Name'}
                  type="text"
                  icon={role === 'student' ? GraduationCap : Building2}
                  placeholder={role === 'student' ? 'e.g. Oxford Institute of Technology' : 'e.g. TechCorp Solutions'}
                  value={extraField}
                  onChange={(e) => setExtraField(e.target.value)}
                />

                {/* Passwords Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Input
                    label="Password"
                    type="password"
                    icon={Key}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    icon={Key}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={ArrowRight}
                  iconPosition="right"
                  isLoading={submitting}
                  className="w-full font-bold shadow-md bg-gradient-to-r from-burgundy-700 to-burgundy-850 hover:bg-burgundy-800 text-white py-2.5 mt-1"
                >
                  Create {role === 'student' ? 'Student' : role === 'company' ? 'Employer' : 'Mentor'} Account
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-champagne-200 dark:border-warmdark-700" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white dark:bg-[#1a1114] text-stone-500 font-medium">
                      or sign up with
                    </span>
                  </div>
                </div>

                <GoogleSignInButton
                  role={role}
                  text={`Sign up with Google as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                />
              </form>

              {/* Bottom Navigation Links */}
              <div className="mt-3.5 pt-3 border-t border-champagne-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <div>
                  <span>Already have an account? </span>
                  <Link
                    to="/login"
                    className="font-bold text-burgundy-700 dark:text-champagne-400 hover:underline"
                  >
                    Sign In
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-semibold text-burgundy-700 dark:text-champagne-400 hover:underline"
                >
                  Forgot Password?
                </button>
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
        onSuccess={() => {
          navigate('/login');
        }}
      />
    </div>
  );
};

export default RegisterPage;
