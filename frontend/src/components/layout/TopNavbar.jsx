import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, LogIn, LogOut, Activity, User, LayoutDashboard, ChevronDown, Users, Briefcase, FileText, UserCheck, Calendar, FileCheck2, MessageSquare, Award, BarChart3, Sparkles, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import StatusBadge from '../common/StatusBadge';
import ThemeToggle from '../common/ThemeToggle';
import NotificationBell from '../common/NotificationBell';
import Button from '../common/Button';
import SimsLogo from '../common/SimsLogo';
import UserAvatar from '../common/UserAvatar';
import { Dropdown, DropdownItem, DropdownDivider } from '../common/Dropdown';

export const TopNavbar = ({ onToggleSidebar, healthStatus, onOpenLogin }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalChatUnread } = useSocket();
  const navigate = useNavigate();
  const isHealthy = healthStatus?.status === 'healthy';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isManager = ['company', 'mentor', 'coordinator', 'admin'].includes(user?.role);

  return (
    <header className="sticky top-0 z-30 surface-panel border-b border-slate-200/90 dark:border-slate-800/80 h-16 transition-colors">
      <div className="h-full px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-2.5 sm:gap-4">
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
            <span className="font-semibold text-slate-700 dark:text-slate-300">InternHub</span>
          </div>

        </div>

        {/* Right Section: System Metrics & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/internships"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-champagne-50 dark:hover:bg-warmdark-850 transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5 text-brand-500" />
            <span>Internships</span>
          </Link>

          <Link
            to="/external-jobs"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-burgundy-800 dark:text-champagne-300 bg-champagne-100/90 dark:bg-warmdark-850 border border-champagne-300/80 dark:border-stone-750 hover:bg-champagne-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-champagne-600" />
            <span>Jobs & LinkedIn</span>
          </Link>

          

          <ThemeToggle />

          {isAuthenticated && (
            <Link
              to="/chat"
              id="top-nav-chat-btn"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Real-time Chat & Messages"
            >
              <MessageSquare className="w-5 h-5 text-brand-500" />
              {totalChatUnread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {totalChatUnread > 99 ? '99+' : totalChatUnread}
                </span>
              )}
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
                  <UserAvatar
                    user={user}
                    size="sm"
                    className="w-7 h-7"
                  />
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
                icon={Sparkles}
                onClick={() => navigate('/external-jobs')}
              >
                Jobs & LinkedIn Radar
              </DropdownItem>
              <DropdownItem
                icon={Bell}
                onClick={() => navigate('/notifications')}
              >
                Notification Center
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
