import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminUsersPage from './pages/AdminUsersPage';
import InternshipsDirectoryPage from './pages/InternshipsDirectoryPage';
import ManageInternshipsPage from './pages/ManageInternshipsPage';
import StudentApplicationsPage from './pages/StudentApplicationsPage';
import CompanyApplicationsPage from './pages/CompanyApplicationsPage';
import StudentAttendancePage from './pages/StudentAttendancePage';
import StudentTasksPage from './pages/StudentTasksPage';
import ManageAllocationsPage from './pages/ManageAllocationsPage';
import ManageAttendancePage from './pages/ManageAttendancePage';
import ManageTasksPage from './pages/ManageTasksPage';
import ChatPage from './pages/ChatPage';
import ReportsPage from './pages/ReportsPage';
import EvaluationsPage from './pages/EvaluationsPage';
import CertificatesPage from './pages/CertificatesPage';
import AdminCertificatesPage from './pages/AdminCertificatesPage';
import VerifyCertificatePage from './pages/VerifyCertificatePage';
import ExternalJobsPage from './pages/ExternalJobsPage';
import NotificationsPage from './pages/NotificationsPage';
import PoliciesPage from './pages/PoliciesPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRedirect from './components/auth/RoleRedirect';
import healthService from './services/healthService';
import NotificationToastContainer from './components/common/NotificationToastContainer';

export const App = () => {
  const [healthStatus, setHealthStatus] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      const data = await healthService.checkHealth();
      if (data?.data) {
        setHealthStatus(data.data);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationToastContainer />
        <AppLayout healthStatus={healthStatus}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/internships" element={<InternshipsDirectoryPage />} />
            <Route path="/external-jobs" element={<ExternalJobsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-certificate" element={<VerifyCertificatePage />} />
            <Route path="/verify-certificate/:code" element={<VerifyCertificatePage />} />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/privacy" element={<PoliciesPage />} />
            <Route path="/terms" element={<PoliciesPage />} />
            <Route path="/security-policy" element={<PoliciesPage />} />
            <Route path="/cookies" element={<PoliciesPage />} />

            {/* Protected authenticated routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Student Workflows */}
            <Route
              path="/my-applications"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-attendance"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-tasks"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentTasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-certificates"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <CertificatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/certificates"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <CertificatesPage />
                </ProtectedRoute>
              }
            />

            {/* Employer, Mentor & Coordinator Workflows */}
            <Route
              path="/manage/applications"
              element={
                <ProtectedRoute allowedRoles={['company', 'mentor', 'coordinator', 'admin']}>
                  <CompanyApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage/allocations"
              element={
                <ProtectedRoute allowedRoles={['company', 'mentor', 'coordinator', 'admin']}>
                  <ManageAllocationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage/attendance"
              element={
                <ProtectedRoute allowedRoles={['company', 'mentor', 'coordinator', 'admin']}>
                  <ManageAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage/tasks"
              element={
                <ProtectedRoute allowedRoles={['company', 'mentor', 'coordinator', 'admin']}>
                  <ManageTasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluations"
              element={
                <ProtectedRoute>
                  <EvaluationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage/internships"
              element={
                <ProtectedRoute allowedRoles={['company', 'mentor', 'coordinator', 'admin']}>
                  <ManageInternshipsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['company', 'mentor', 'coordinator', 'admin']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Administrator console */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/certificates"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <AdminCertificatesPage />
                </ProtectedRoute>
              }
            />

            {/* Role-Aware Smart Navigation Redirects */}
            <Route
              path="/tasks"
              element={
                <RoleRedirect
                  student="/my-tasks"
                  company="/manage/tasks"
                  mentor="/manage/tasks"
                  coordinator="/manage/tasks"
                  admin="/manage/tasks"
                />
              }
            />
            <Route
              path="/applications"
              element={
                <RoleRedirect
                  student="/my-applications"
                  company="/manage/applications"
                  mentor="/manage/applications"
                  coordinator="/manage/applications"
                  admin="/manage/applications"
                />
              }
            />
            <Route
              path="/attendance"
              element={
                <RoleRedirect
                  student="/my-attendance"
                  company="/manage/attendance"
                  mentor="/manage/attendance"
                  coordinator="/manage/attendance"
                  admin="/manage/attendance"
                />
              }
            />
            <Route
              path="/allocations"
              element={
                <RoleRedirect
                  student="/dashboard"
                  company="/manage/allocations"
                  mentor="/manage/allocations"
                  coordinator="/manage/allocations"
                  admin="/manage/allocations"
                />
              }
            />
            <Route
              path="/users"
              element={
                <RoleRedirect
                  student="/dashboard"
                  company="/dashboard"
                  mentor="/dashboard"
                  coordinator="/dashboard"
                  admin="/admin/users"
                />
              }
            />

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppLayout>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
