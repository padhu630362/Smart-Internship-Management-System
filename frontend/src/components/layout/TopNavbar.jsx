import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, LogIn, LogOut, Activity, User, LayoutDashboard, ChevronDown, Users, Briefcase, FileText, UserCheck, Calendar, FileCheck2, MessageSquare, Award, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../common/StatusBadge';
import ThemeToggle from '../common/ThemeToggle';
import NotificationBell from '../common/NotificationBell';
import Button from '../common/Button';
import SimsLogo from '../common/SimsLogo';
import { Dropdown, DropdownItem, DropdownDivider } from '../common/Dropdown';

export const TopNavbar = ({ onToggleSidebar, healthStatus, onOpenLogin }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const isHealthy = healthStatus?.status === 'healthy';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isManager = ['company', 'mentor', 'coordinator', 'admin'].includes(user?.role);

  return (
    <header className="sticky top-0 z-30 surface-panel border-b border-slate-200/90 dark:border-slate-800/80 h-16 transition-colors">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left Section: Mobile Menu Button & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="lg:hidden">
            <SimsLogo size="sm" showText={false} />
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Smart Internship Management System</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Phase 12 • College Demo Ready (v1.0)
            </span>
          </div>

        </div>

        {/* Right Section: System Metrics & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/internships"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5 text-brand-500" />
            <span>Explore Internships</span>
          </Link>

          {/* Health Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 text-xs">
            <Activity className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
            <span className="text-slate-500 dark:text-slate-400">API:</span>
            <span className={`font-semibold ${isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
              {isHealthy ? 'Connected (5001)' : 'Checking'}
            </span>
          </div>

          <ThemeToggle />

          {isAuthenticated && (
            <Link
              to="/chat"
              id="top-nav-chat-btn"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Real-time Chat & Messages"
            >
              <MessageSquare className="w-5 h-5 text-brand-500" />
            </Link>
          )}

          {isAuthenticated && <NotificationBell />}

          {isAuthenticated ? (
            <Dropdown
              align="right"
              width="w-56"
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg gradient-brand text-white flex items-center justify-center font-bold text-xs">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden sm:block leading-none">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                      {user?.name}
                    </p>
                    <p className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold capitalize mt-0.5">
                      {user?.role}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>
              }
            >
              <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                <p className="font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-slate-400 font-mono text-[10px] truncate">{user?.email}</p>
              </div>
              <DropdownItem
                icon={LayoutDashboard}
                onClick={() => navigate('/dashboard')}
              >
                My Dashboard
              </DropdownItem>
              <DropdownItem
                icon={User}
                onClick={() => navigate('/profile')}
              >
                My Profile
              </DropdownItem>
              <DropdownItem
                icon={Briefcase}
                onClick={() => navigate('/internships')}
              >
                Explore Internships
              </DropdownItem>
              <DropdownItem
                icon={Award}
                onClick={() => navigate('/evaluations')}
              >
                Evaluations
              </DropdownItem>

              {user?.role === 'student' && (
                <>
                  <DropdownItem
                    icon={FileText}
                    onClick={() => navigate('/my-applications')}
                  >
                    My Applications
                  </DropdownItem>
                  <DropdownItem
                    icon={Calendar}
                    onClick={() => navigate('/my-attendance')}
                  >
                    Daily Attendance
                  </DropdownItem>
                  <DropdownItem
                    icon={FileCheck2}
                    onClick={() => navigate('/my-tasks')}
                  >
                    Milestone Tasks
                  </DropdownItem>
                </>
              )}

              {isManager && (
                <>
                  <DropdownItem
                    icon={UserCheck}
                    onClick={() => navigate('/manage/applications')}
                  >
                    Candidate Screening
                  </DropdownItem>
                  <DropdownItem
                    icon={Users}
                    onClick={() => navigate('/manage/allocations')}
                  >
                    Intern Allocations
                  </DropdownItem>
                  <DropdownItem
                    icon={Calendar}
                    onClick={() => navigate('/manage/attendance')}
                  >
                    Attendance Audit
                  </DropdownItem>
                  <DropdownItem
                    icon={FileCheck2}
                    onClick={() => navigate('/manage/tasks')}
                  >
                    Milestone Tasks
                  </DropdownItem>
                  <DropdownItem
                    icon={Briefcase}
                    onClick={() => navigate('/manage/internships')}
                  >
                    Manage Opportunities
                  </DropdownItem>
                  <DropdownItem
                    icon={BarChart3}
                    onClick={() => navigate('/reports')}
                  >
                    Reports & Analytics
                  </DropdownItem>
                </>
              )}

              {user?.role === 'admin' && (
                <DropdownItem
                  icon={Users}
                  onClick={() => navigate('/admin/users')}
                >
                  User Management
                </DropdownItem>
              )}

              <DropdownDivider />
              <DropdownItem icon={LogOut} danger onClick={handleLogout}>
                Sign Out
              </DropdownItem>
            </Dropdown>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="primary" size="sm" icon={LogIn} className="shadow-sm font-semibold">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
