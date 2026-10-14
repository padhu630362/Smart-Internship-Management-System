import React from 'react';

/**
 * Accessible enterprise StatusBadge with light and dark mode contrast
 */
export const StatusBadge = ({
  status = 'neutral',
  label,
  dot = true,
  pulse = false,
  size = 'md',
  className = '',
}) => {
  const getStyles = () => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'success':
      case 'active':
      case 'connected':
      case 'published':
      case 'selected':
        return {
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
          dot: 'bg-emerald-500 dark:bg-emerald-400',
        };
      case 'warning':
      case 'pending':
      case 'connecting':
      case 'under_review':
      case 'revision_requested':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
          dot: 'bg-amber-500 dark:bg-amber-400',
        };
      case 'danger':
      case 'error':
      case 'disconnected':
      case 'offline':
      case 'rejected':
      case 'suspended':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30',
          dot: 'bg-rose-500 dark:bg-rose-400',
        };
      case 'info':
      case 'brand':
      case 'shortlisted':
      case 'submitted':
        return {
          badge: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/30',
          dot: 'bg-brand-500 dark:bg-brand-400',
        };
      case 'interview':
      case 'interview_scheduled':
        return {
          badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30',
          dot: 'bg-purple-500 dark:bg-purple-400',
        };
      case 'withdrawn':
      case 'draft':
      case 'closed':
      case 'archived':
        return {
          badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          dot: 'bg-slate-400 dark:bg-slate-500',
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          dot: 'bg-slate-400 dark:bg-slate-500',
        };
    }
  };

  const style = getStyles();
  const sizeStyles = size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-2xs select-none ${style.badge} ${sizeStyles} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} ${
            pulse ? 'animate-pulse' : ''
          }`}
        />
      )}
      <span>{label || status}</span>
    </span>
  );
};

export default StatusBadge;
