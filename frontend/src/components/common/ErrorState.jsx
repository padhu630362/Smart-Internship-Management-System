import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export const ErrorState = ({
  title = 'Failed to load content',
  message = 'An unexpected error occurred while communicating with the server.',
  code,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`surface-card border-rose-200 dark:border-rose-900/40 p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-2 leading-relaxed">
        {message}
      </p>
      {code && (
        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 mb-6">
          Code: {code}
        </span>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
