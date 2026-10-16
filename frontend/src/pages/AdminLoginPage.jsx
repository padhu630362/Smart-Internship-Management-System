import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy AdminLoginPage: Redirects seamlessly to the unified common login page.
 * All stakeholders (Admins, Coordinators, Companies, Mentors, Students) authenticate via /login.
 */
export const AdminLoginPage = () => {
  return <Navigate to="/login" replace />;
};

export default AdminLoginPage;
