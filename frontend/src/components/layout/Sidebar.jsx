import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  GraduationCap,
  Building2,
  UserCheck,
  ShieldCheck,
  Activity,
  Lock,
  X,
  LogOut,
  User,
  Users,
  Briefcase,
  FileText,
  Calendar,
  FileCheck2,
  MessageSquare,
  Award,
  BarChart3,
  Sparkles,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SimsLogo from '../common/SimsLogo';
import StatusBadge from '../common/StatusBadge';
import ThemeToggle from '../common/ThemeToggle';

export const Sidebar = ({ isOpen, onClose, healthStatus }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const isManager = ['company', 'mentor', 'coordinator', 'admin'].includes(user?.role);

  // Close drawer on Escape key press for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const mainNav = [
    { name: 'System Overview', path: '/', icon: LayoutDashboard },
    { name: 'Internship Directory', path: '/internships', icon: Briefcase },
    { name: 'Jobs & LinkedIn Radar', path: '/external-jobs', icon: Sparkles },
    ...(isAuthenticated
      ? [
          { name: 'My Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Notifications', path: '/notifications', icon: Bell },
          { name: 'Direct & Group Chat', path: '/chat', icon: MessageSquare },
          { name: 'Evaluations', path: '/evaluations', icon: Award },
          { name: 'My Profile', path: '/profile', icon: User },
          ...(user?.role === 'student'
            ? [
                { name: 'My Applications', path: '/my-applications', icon: FileText },
                { name: 'Daily Attendance', path: '/my-attendance', icon: Calendar },
                { name: 'Milestone Tasks', path: '/my-tasks', icon: FileCheck2 },
                { name: 'My Certificates', path: '/my-certificates', icon: Award },
              ]
            : []),
          ...(isManager
            ? [
                { name: 'Candidate Review', path: '/manage/applications', icon: UserCheck },
                { name: 'Intern Allocations', path: '/manage/allocations', icon: Users },
                { name: 'Attendance Audit', path: '/manage/attendance', icon: Calendar },
                { name: 'Manage Tasks', path: '/manage/tasks', icon: FileCheck2 },
                { name: 'Manage Opportunities', path: '/manage/internships', icon: Briefcase },
                { name: 'Reports & Export', path: '/reports', icon: BarChart3 },
              ]
            : []),
          ...(user?.role === 'admin'
            ? [{ name: 'User Management', path: '/admin/users', icon: Users }]
            : []),
        ]
      : []),
    { name: 'Verify Certificate', path: '/verify-certificate', icon: ShieldCheck },
    { name: 'Implementation Roadmap', path: '/roadmap', icon: Map },
  ];

  const roleWorkspaces = [
    { name: 'Student Portal', role: 'student', icon: GraduationCap },
    { name: 'Employer Hub', role: 'company', icon: Building2 },
    { name: 'Mentor Workspace', role: 'mentor', icon: UserCheck },
    { name: 'Coordinator Hub', role: 'coordinator', icon: GraduationCap },
    { name: 'Admin Console', role: 'admin', icon: ShieldCheck },
  ];

  const isDbConnected = healthStatus?.database?.connected;

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        role="navigation"
        aria-label="Main application sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 surface-sidebar flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between">
          <SimsLogo size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Core Platform
            </div>
            <nav className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => onClose && onClose()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 font-semibold dark:bg-brand-600/15 dark:text-brand-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Role Workspaces */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
              <span>Role Workspaces</span>
              <span className="text-[9px] font-medium text-slate-400 lowercase">rbac</span>
            </div>
            <div className="space-y-1">
              {roleWorkspaces.map((ws) => {
                const Icon = ws.icon;
                const isUserRole = user?.role === ws.role;

                return (
                  <NavLink
                    key={ws.name}
                    to="/dashboard"
                    onClick={() => onClose && onClose()}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                      isUserRole
                        ? 'bg-brand-50/80 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isUserRole ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                      <span>{ws.name}</span>
                    </div>
                    {isUserRole ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                        <Lock className="w-2.5 h-2.5" />
                        RBAC
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Live System Diagnostics Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800 text-xs space-y-2.5">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                <Activity className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
                Platform Status
              </span>
              <StatusBadge
                status={healthStatus?.status === 'healthy' ? 'healthy' : 'warning'}
                label={healthStatus?.status === 'healthy' ? 'Active' : 'Checking'}
                size="sm"
              />
            </div>

            <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Database:</span>
                <span className={`font-semibold ${isDbConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                  {isDbConnected ? 'Connected' : 'Standby'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>System Engine:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer with Auth Status or Version */}
        <div className="p-3.5 border-t border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          {isAuthenticated ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-full gradient-brand text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="truncate leading-none">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="text-[11px] text-slate-500 font-mono">
                v1.0 • College Demo Ready
              </div>
              <ThemeToggle />
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
