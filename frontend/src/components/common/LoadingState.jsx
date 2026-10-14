import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };
  return <Loader2 className={`animate-spin text-brand-600 dark:text-brand-400 ${sizes[size]} ${className}`} />;
};

export const LoadingState = ({ message = 'Loading data...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <Spinner size="lg" className="mb-3" />
      <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
        {message}
      </p>
    </div>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="surface-card p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="w-16 h-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>
      <div className="w-2/3 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="w-full h-12 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    </div>
  );
};

LoadingState.Spinner = Spinner;
LoadingState.SkeletonCard = SkeletonCard;

export default LoadingState;
