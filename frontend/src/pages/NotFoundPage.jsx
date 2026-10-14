import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import Button from '../components/common/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
        404 — Page Not Found
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
        The route you requested does not exist or may have been relocated in this phase of SIMS.
      </p>
      <Link to="/">
        <Button variant="primary" size="md" icon={Home}>
          Return to System Overview
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
