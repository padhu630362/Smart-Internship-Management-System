import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from '../common/LoadingState';

export const RoleRedirect = ({
  student,
  company,
  mentor,
  coordinator,
  admin,
  fallback = '/dashboard',
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingState message="Redirecting to authorized workspace..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user?.role;
  let target = fallback;

  if (role === 'student' && student) {
    target = student;
  } else if (role === 'company') {
    target = company || coordinator || admin || fallback;
  } else if (role === 'mentor') {
    target = mentor || company || coordinator || admin || fallback;
  } else if (role === 'coordinator') {
    target = coordinator || admin || company || fallback;
  } else if (role === 'admin') {
    target = admin || coordinator || fallback;
  }

  return <Navigate to={target} replace />;
};

export default RoleRedirect;

