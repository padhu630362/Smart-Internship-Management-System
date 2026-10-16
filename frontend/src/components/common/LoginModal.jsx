import React, { useState } from 'react';
import { Lock, Mail, Key, ShieldCheck, ArrowRight, Info } from 'lucide-react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import StatusBadge from './StatusBadge';

export const LoginModal = ({ isOpen, onClose }) => {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate honest notice without fake token storage
    setTimeout(() => {
      setSubmitting(false);
      setNotice(true);
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="InternHub Stakeholder Access"
      description="Select your role to sign into your authenticated workspace"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role Selector Pill */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Account Workspace Role
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium">
            {['student', 'company', 'mentor', 'admin'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-1.5 px-2 rounded-lg capitalize transition-all ${
                  role === r
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Institutional / Corporate Email"
          type="email"
          icon={Mail}
          placeholder="name@university.edu or name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          required
        />

        <Input
          label="Password"
          type="password"
          icon={Key}
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <div className="flex items-center justify-between text-xs text-slate-500">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" className="rounded text-brand-600 focus:ring-brand-500" />
            <span>Remember session</span>
          </label>
          <span className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
            Forgot password?
          </span>
        </div>

        {notice && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 animate-in fade-in">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Unlocks in Phase 2</p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-400/90 leading-relaxed">
                Full JWT session generation and database user models are part of Phase 2.
                No mock tokens or fake credentials are stored.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={submitting}
            icon={ArrowRight}
            iconPosition="right"
          >
            Sign In to {role.charAt(0).toUpperCase() + role.slice(1)}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LoginModal;
