import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Briefcase,
  FileText,
  UserCheck,
  Calendar,
  FileCheck2,
  Clock,
  Megaphone,
  Radio,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  X,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { NOTIFICATION_TYPES } from '../../services/notificationService';

export const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    pushPermission,
    requestPushPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useSocket();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread') return !notif.isRead;
    return true;
  });

  // Map destination link intelligently based on user role
  const resolveTargetLink = (link, type) => {
    if (type === NOTIFICATION_TYPES.NEW_MESSAGE || link?.includes('chat')) {
      return link || '/chat';
    }
    if (type === NOTIFICATION_TYPES.JOB_ALERT || link?.includes('external-jobs')) {
      return '/external-jobs';
    }
    if (!link) return '/dashboard';
    if (user?.role === 'student') {
      if (link.includes('application')) return '/my-applications';
      if (link.includes('task')) return '/my-tasks';
      if (link.includes('attendance')) return '/my-attendance';
      if (link.includes('internship') || link.includes('opportunit')) return '/internships';
      if (link.includes('certificate')) return '/certificates';
      if (link.includes('evaluation')) return '/evaluations';
    } else {
      if (link.includes('application')) return '/manage/applications';
      if (link.includes('task')) return '/manage/tasks';
      if (link.includes('attendance')) return '/manage/attendance';
      if (link.includes('allocation')) return '/manage/allocations';
      if (link.includes('internship') || link.includes('opportunit')) return '/manage/internships';
      if (link.includes('user')) return '/users';
      if (link.includes('certificate')) return '/certificates';
      if (link.includes('evaluation')) return '/evaluations';
    }
    return link;
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    setIsOpen(false);
    const target = resolveTargetLink(notif.link, notif.type);
    navigate(target);
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.NEW_MESSAGE:
        return <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case NOTIFICATION_TYPES.JOB_ALERT:
        return <Sparkles className="w-4 h-4 text-champagne-500" />;
      case NOTIFICATION_TYPES.OPPORTUNITY_PUBLISHED:
        return <Briefcase className="w-4 h-4 text-brand-500" />;
      case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
        return <FileText className="w-4 h-4 text-blue-500" />;
      case NOTIFICATION_TYPES.APPLICATION_STATUS:
        return <Clock className="w-4 h-4 text-emerald-500" />;
      case NOTIFICATION_TYPES.INTERN_ALLOCATED:
        return <UserCheck className="w-4 h-4 text-purple-500" />;
      case NOTIFICATION_TYPES.USER_REGISTERED:
        return <UserCheck className="w-4 h-4 text-indigo-500" />;
      case NOTIFICATION_TYPES.CERTIFICATE_ISSUED:
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
      case NOTIFICATION_TYPES.TASK_DEADLINE:
        return <Calendar className="w-4 h-4 text-rose-500" />;
      case NOTIFICATION_TYPES.TASK_FEEDBACK:
        return <FileCheck2 className="w-4 h-4 text-teal-500" />;
      case NOTIFICATION_TYPES.ATTENDANCE_REVIEWED:
        return <Clock className="w-4 h-4 text-cyan-500" />;
      case NOTIFICATION_TYPES.MENTOR_ANNOUNCEMENT:
      case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
        return <Megaphone className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-brand-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="notification-bell-button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl border border-champagne-200/80 dark:border-stone-750 hover:bg-champagne-50/80 dark:hover:bg-warmdark-850 text-stone-600 dark:text-stone-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-burgundy-600 text-[10px] font-bold text-white shadow-sm animate-in zoom-in-75 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Live Socket Status Pip */}
        <span
          title={isConnected ? 'Real-Time Connected' : 'Connecting to Real-Time Feed'}
          className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-warmdark-900 ${
            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-warmdark-900 border border-champagne-200 dark:border-stone-800 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-champagne-100 dark:border-stone-800 flex items-center justify-between gap-2 bg-gradient-to-r from-burgundy-50/50 to-champagne-50/40 dark:from-warmdark-850 dark:to-warmdark-900">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">Notifications</h3>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="text-[10px] font-medium text-stone-400">Offline</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  id="mark-all-read-btn"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-warmdark-800 transition-colors"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-warmdark-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Optional Push Notification Permission Prompt */}
          {pushPermission !== 'granted' && (
            <div className="px-3.5 py-2 bg-champagne-50/90 dark:bg-warmdark-850 border-b border-champagne-200/60 dark:border-stone-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-stone-800 dark:text-champagne-200 font-medium">
                Get live job alerts on your desktop?
              </span>
              <button
                type="button"
                onClick={requestPushPermission}
                className="px-2 py-0.5 rounded-lg bg-champagne-500 hover:bg-champagne-600 text-stone-900 font-bold text-[10px] transition-colors"
              >
                Enable
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="px-3 pt-2 pb-1 bg-stone-50/70 dark:bg-warmdark-850 border-b border-peach-100 dark:border-stone-800 flex gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-warmdark-800 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-white dark:bg-warmdark-800 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-peach-100/70 dark:divide-stone-850">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">Loading notifications...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-peach-50 dark:bg-warmdark-800 flex items-center justify-center mx-auto text-peach-400 mb-2">
                  <Bell className="w-5 h-5 opacity-70" />
                </div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Job matches and system alerts will appear here instantly.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`p-3 text-xs transition-colors group flex items-start gap-3 hover:bg-peach-50/60 dark:hover:bg-warmdark-850/60 ${
                    !notif.isRead ? 'bg-peach-50/40 dark:bg-brand-950/20' : ''
                  }`}
                >
                  {/* Type Icon Badge */}
                  <div className="shrink-0 mt-0.5 w-7 h-7 rounded-xl bg-peach-50/80 dark:bg-warmdark-800 flex items-center justify-center border border-peach-200/50 dark:border-stone-700/50">
                    {getTypeIcon(notif.type)}
                  </div>

                  {/* Body Content */}
                  <div
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !notif.isRead
                            ? 'font-bold text-stone-900 dark:text-white'
                            : 'font-semibold text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.link && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                        <span>View details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Item Actions */}
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif._id);
                        }}
                        className="p-1 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-stone-200/50 dark:hover:bg-warmdark-700"
                        title="Mark as read"
                        aria-label="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif._id);
                      }}
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-stone-200/50 dark:hover:bg-warmdark-700"
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-peach-50/60 dark:bg-warmdark-850 border-t border-peach-100 dark:border-stone-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={refreshNotifications}
              className="text-[11px] font-medium text-stone-500 hover:text-brand-600 dark:text-stone-400 dark:hover:text-brand-400"
            >
              Refresh feed
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="text-[11px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
            >
              <span>View full history</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
