import React from 'react';
import { MessageSquare, Plus, Users, Sparkles, Shield, Building2 } from 'lucide-react';
import Button from '../common/Button';

/**
 * Empty state displayed when no conversation is actively selected on desktop.
 * Designed with a clean SaaS aesthetic matching SIMS brand standards.
 */
export const EmptyChatState = ({
  onNewDirectChat,
  onNewGroupChat,
  canCreateGroup = true,
}) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50/70 dark:bg-slate-950/60 select-none">
      <div className="max-w-md w-full flex flex-col items-center">
        {/* Decorative App Icon Badge */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm transition-transform hover:scale-105 duration-200">
            <MessageSquare className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-brand-600 dark:text-brand-400">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Heading & Value Proposition */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          SIMS Workspace Messaging
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mb-8">
          Communicate directly with students, academic mentors, company supervisors, and cohort coordinators in real time.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          {onNewDirectChat && (
            <Button
              onClick={onNewDirectChat}
              size="md"
              className="bg-brand-600 hover:bg-brand-500 text-white font-medium shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start Direct Message</span>
            </Button>
          )}

          {canCreateGroup && onNewGroupChat && (
            <Button
              variant="outline"
              onClick={onNewGroupChat}
              size="md"
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Create Channel</span>
            </Button>
          )}
        </div>

        {/* Security & Organization Notice */}
        <div className="mt-12 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center gap-6 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Role-Authorized Messaging</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Internship Workspaces</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmptyChatState;
