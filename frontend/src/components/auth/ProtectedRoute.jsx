import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from '../common/LoadingState';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import Button from '../common/Button';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingState message="Verifying session and security credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="surface-card border-amber-200 dark:border-amber-900/40 p-8 sm:p-12 text-center max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Access Restricted by Policy
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          This workspace requires role authorization for{' '}
          <span className="font-semibold text-slate-900 dark:text-white">
            [{allowedRoles.join(', ')}]
          </span>
          . Your active account is categorized as{' '}
          <span className="font-mono uppercase font-bold text-brand-600 dark:text-brand-400">
            '{user?.role}'
          </span>
          .
        </p>
        <Link to="/dashboard">
          <Button variant="primary" size="md" icon={ArrowRight} iconPosition="right">
            Proceed to My Authorized Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
