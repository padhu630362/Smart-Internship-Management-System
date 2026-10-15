import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Key,
  Building2,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import SimsLogo from '../components/common/SimsLogo';
import GoogleSignInButton from '../components/common/GoogleSignInButton';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [extraField, setExtraField] = useState('');

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name || name.trim().length < 2) {
      setFormError('Full name must be at least 2 characters long.');
      return;
    }

    if (!email || !email.includes('@')) {
      setFormError('Please provide a valid institutional or company email.');
      return;
    }

    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      setFormError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Password and confirmation password do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        email,
        password,
        role,
        profile:
          role === 'student'
            ? { studentDetails: { university: extraField } }
            : role === 'company'
            ? { companyDetails: { companyName: extraField } }
            : { mentorDetails: { companyName: extraField } },
      };

      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block">
            <SimsLogo size="md" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Create Your SIM Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Join the smart internship ecosystem as a Student, Host Employer, or Mentor
          </p>
        </div>

        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 sm:p-8">
            {formError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Allowed Role Selection Tabs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Account Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                      role === 'student'
                        ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('company')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                      role === 'company'
                        ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Company</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('mentor')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                      role === 'mentor'
                        ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Mentor</span>
                  </button>
                </div>
              </div>

              {/* Administrative Policy Reminder */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Admin and Coordinator roles cannot be self-registered. They are provisioned by academic staff.
                </span>
              </div>

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
                label={role === 'student' ? 'Student University Email' : role === 'company' ? 'Corporate Company Email' : 'Professional Email'}
                type="email"
                icon={Mail}
                placeholder={role === 'student' ? 'name@university.edu' : role === 'company' ? 'hiring@company.com' : 'mentor@company.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label={role === 'student' ? 'College / University Name' : 'Company / Organization Name'}
                type="text"
                icon={role === 'student' ? GraduationCap : Building2}
                placeholder={role === 'student' ? 'e.g. Oxford Institute of Technology' : 'e.g. TechCorp Solutions'}
                value={extraField}
                onChange={(e) => setExtraField(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className="w-full font-semibold shadow-sm mt-3"
              >
                Complete Registration
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-champagne-200 dark:border-warmdark-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white dark:bg-[#1a1114] text-stone-500 font-medium">
                    or sign up with
                  </span>
                </div>
              </div>

              <GoogleSignInButton role={role} text={`Sign up as ${role.charAt(0).toUpperCase() + role.slice(1)} with Google`} />
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              <span>Already have an account? </span>
              <Link
                to="/login"
                className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Sign In to Workspace
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
