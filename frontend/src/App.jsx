import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import RoadmapPage from './pages/RoadmapPage';
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
import ProtectedRoute from './components/auth/ProtectedRoute';
import healthService from './services/healthService';

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
        <AppLayout healthStatus={healthStatus}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/internships" element={<InternshipsDirectoryPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

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

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppLayout>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
