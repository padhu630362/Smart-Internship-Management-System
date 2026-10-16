import React, { useState, useEffect } from 'react';
import { Mail, Key, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, Lock } from 'lucide-react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import authService from '../../services/authService';

export const ForgotPasswordModal = ({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccess,
}) => {
  const [step, setStep] = useState('request'); // 'request' | 'verify' | 'newPassword' | 'success'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Sync initial email when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      setError('');
      setNotice('');
      setStep('request');
    }
  }, [isOpen, initialEmail]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Step 1: Request 6-digit Code
  const handleRequestCode = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.trim()) {
      setError('Please provide a valid registered email address.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const res = await authService.forgotPassword(email.trim().toLowerCase());
      setNotice(res.message || 'A 6-digit verification code has been dispatched to your email address.');
      setCode(''); // Keep empty, user enters code received in personal email
      setCooldownSeconds(60);
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to dispatch verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit Code
  const handleVerifyCode = async (e) => {
    if (e) e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authService.verifyResetCode({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      setResetToken(res.data?.resetToken || '');
      setError('');
      setNotice('');
      setStep('newPassword');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.resetPassword({
        token: resetToken,
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });
      setStep('success');
      if (onSuccess) {
        onSuccess(email.trim().toLowerCase());
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update password. Token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'request':
        return 'Reset Account Password';
      case 'verify':
        return 'Enter Verification Code';
      case 'newPassword':
        return 'Create New Password';
      case 'success':
        return 'Password Reset Complete';
      default:
        return 'Reset Password';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'request':
        return 'Enter your registered email address to receive a secure 6-digit verification code.';
      case 'verify':
        return `Enter the 6-digit code sent to ${email}.`;
      case 'newPassword':
        return 'Create a strong, secure new password for your InternHub account.';
      case 'success':
        return 'Your account password has been updated successfully.';
      default:
        return '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      description={getSubtitle()}
    >
      <div className="space-y-4">
        {/* Error Banner */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Success / Dispatched Notice */}
        {notice && !error && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 'request' && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <Input
              label="Registered Email Address"
              type="email"
              icon={Mail}
              placeholder="name@university.edu or name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={loading}
                icon={ArrowRight}
                iconPosition="right"
              >
                Send 6-Digit Code
              </Button>
            </div>
          </form>
        )}

        {/* STEP 2: Enter 6-digit Code */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-burgundy-500/20 focus:border-burgundy-600 shadow-inner"
                autoFocus
                required
              />
              <p className="text-[11px] text-stone-500 text-center">
                Code expires in 15 minutes. Check your personal inbox and spam folder.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={cooldownSeconds > 0 || loading}
                onClick={handleRequestCode}
                className="text-xs font-semibold text-burgundy-700 dark:text-champagne-400 hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : 'Resend code'}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('request')}
                >
                  Change Email
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={loading}
                  disabled={code.length !== 6}
                >
                  Verify Code
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: Enter New Password */}
        {step === 'newPassword' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              icon={Key}
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              icon={Key}
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={loading}
              >
                Update Password
              </Button>
            </div>
          </form>
        )}

        {/* STEP 4: Success confirmation */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-stone-900 dark:text-white">
                Password Successfully Reset
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                You can now log in with your updated credentials and enter your dashboard.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={onClose}
            >
              Sign In to Workspace
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ForgotPasswordModal;

