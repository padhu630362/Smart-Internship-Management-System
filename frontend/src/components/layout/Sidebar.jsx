import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Building2,
  UserCheck,
  ShieldCheck,
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
import { useSocket } from '../../context/SocketContext';
import SimsLogo from '../common/SimsLogo';
import ThemeToggle from '../common/ThemeToggle';

export const Sidebar = ({ isOpen, onClose, healthStatus }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount, totalChatUnread } = useSocket();
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
  ];

  const roleWorkspaces = [
    { name: 'Student Portal', role: 'student', icon: GraduationCap },
    { name: 'Employer Hub', role: 'company', icon: Building2 },
    { name: 'Mentor Workspace', role: 'mentor', icon: UserCheck },
    { name: 'Coordinator Hub', role: 'coordinator', icon: GraduationCap },
    { name: 'Admin Console', role: 'admin', icon: ShieldCheck },
  ];

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
                      `flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 font-semibold dark:bg-brand-600/15 dark:text-brand-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-100'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {item.path === '/notifications' && unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-burgundy-600 text-white shrink-0 shadow-xs">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}

                    {item.path === '/chat' && totalChatUnread > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white shrink-0 shadow-xs animate-pulse">
                        {totalChatUnread > 99 ? '99+' : totalChatUnread}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Role Workspaces */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              <span>Role Workspaces</span>
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
                    {isUserRole && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        Active
                      </span>
                    )}
                  </NavLink>
                );
              })}
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
            <div className="flex items-center justify-end w-full">
              <ThemeToggle />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
