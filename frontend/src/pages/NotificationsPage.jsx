import React, { useState, useEffect } from 'react';
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
  Filter,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { NOTIFICATION_TYPES } from '../services/notificationService';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';

export const NotificationsPage = () => {
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
    clearAllNotifications,
    refreshNotifications,
  } = useSocket();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'job_alert' | 'application' | 'task'

  // Map destination link intelligently based on user role
  const resolveTargetLink = (link) => {
    if (!link) return '/dashboard';
    if (user?.role === 'student') {
      if (link.includes('application')) return '/my-applications';
      if (link.includes('task')) return '/my-tasks';
      if (link.includes('attendance')) return '/my-attendance';
      if (link.includes('opportunit') || link.includes('external-jobs')) return '/external-jobs';
      if (link.includes('internship')) return '/internships';
    } else {
      if (link.includes('application')) return '/manage/applications';
      if (link.includes('task')) return '/manage/tasks';
      if (link.includes('attendance')) return '/manage/attendance';
      if (link.includes('allocation')) return '/manage/allocations';
      if (link.includes('internship')) return '/manage/internships';
    }
    return link;
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    const target = resolveTargetLink(notif.link);
    navigate(target);
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filterType === 'unread') return !notif.isRead;
    if (filterType === 'job_alert') return notif.type === NOTIFICATION_TYPES.JOB_ALERT;
    if (filterType === 'application')
      return [NOTIFICATION_TYPES.APPLICATION_SUBMITTED, NOTIFICATION_TYPES.APPLICATION_STATUS].includes(notif.type);
    if (filterType === 'task')
      return [NOTIFICATION_TYPES.TASK_ASSIGNED, NOTIFICATION_TYPES.TASK_DEADLINE, NOTIFICATION_TYPES.TASK_FEEDBACK].includes(notif.type);
    return true;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.JOB_ALERT:
        return <Sparkles className="w-5 h-5 text-peach-500" />;
      case NOTIFICATION_TYPES.OPPORTUNITY_PUBLISHED:
        return <Briefcase className="w-5 h-5 text-brand-500" />;
      case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
        return <FileText className="w-5 h-5 text-blue-500" />;
      case NOTIFICATION_TYPES.APPLICATION_STATUS:
        return <Clock className="w-5 h-5 text-emerald-500" />;
      case NOTIFICATION_TYPES.INTERN_ALLOCATED:
        return <UserCheck className="w-5 h-5 text-purple-500" />;
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
      case NOTIFICATION_TYPES.TASK_DEADLINE:
        return <Calendar className="w-5 h-5 text-rose-500" />;
      case NOTIFICATION_TYPES.TASK_FEEDBACK:
        return <FileCheck2 className="w-5 h-5 text-teal-500" />;
      case NOTIFICATION_TYPES.ATTENDANCE_REVIEWED:
        return <Clock className="w-5 h-5 text-cyan-500" />;
      case NOTIFICATION_TYPES.MENTOR_ANNOUNCEMENT:
      case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
        return <Megaphone className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-brand-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="surface-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-peach-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-burgundy-600 text-white shadow-xs">
                {unreadCount} Unread
              </span>
            )}
            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                Live WebSocket Active
              </span>
            ) : (
              <span className="text-xs text-stone-400">Offline</span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Real-time workflow alerts, AI matching notices, and system announcements.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2">
          {pushPermission !== 'granted' && (
            <Button
              variant="outline"
              size="sm"
              icon={Bell}
              onClick={requestPushPermission}
              className="text-xs border-champagne-300 hover:bg-champagne-50"
            >
              Enable Browser Push
            </Button>
          )}

          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={CheckCheck}
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark All as Read
            </Button>
          )}

          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={() => {
                if (confirm('Clear all notifications from your inbox?')) {
                  clearAllNotifications(false);
                }
              }}
              className="text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 border-b border-champagne-100 dark:border-stone-800">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === 'all'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'text-stone-600 hover:bg-champagne-50 dark:text-stone-400'
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === 'unread'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'text-stone-600 hover:bg-champagne-50 dark:text-stone-400'
          }`}
        >
          Unread ({unreadCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('job_alert')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            filterType === 'job_alert'
              ? 'bg-champagne-500 text-stone-900 shadow-xs'
              : 'text-stone-600 hover:bg-champagne-50 dark:text-stone-400'
          }`}
        >
          <Sparkles className="w-3 h-3 text-burgundy-600 dark:text-champagne-300" />
          <span>Job & Internship Alerts</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('application')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            filterType === 'application'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-stone-600 hover:bg-champagne-50 dark:text-stone-400'
          }`}
        >
          <FileText className="w-3 h-3" />
          <span>Applications</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('task')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            filterType === 'task'
              ? 'bg-burgundy-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-champagne-50 dark:text-stone-400'
          }`}
        >
          <Calendar className="w-3 h-3" />
          <span>Tasks & Deadlines</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="surface-card divide-y divide-peach-100 dark:divide-stone-850 overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="py-16 text-center text-xs text-stone-400">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filterType === 'unread' ? 'No unread notifications' : 'No notifications in this category'}
            description="When opportunities are published, tasks assigned, or status updates occur, alerts appear here in real-time."
            actionText="Refresh Feed"
            onAction={refreshNotifications}
          />
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif._id}
              className={`p-4 sm:p-5 transition-colors group flex items-start gap-4 hover:bg-peach-50/50 dark:hover:bg-warmdark-850 ${
                !notif.isRead ? 'bg-peach-50/30 dark:bg-brand-950/20' : ''
              }`}
            >
              {/* Type Icon Badge */}
              <div className="shrink-0 mt-1 w-10 h-10 rounded-2xl bg-peach-50 dark:bg-warmdark-800 flex items-center justify-center border border-peach-200/60 dark:border-stone-700/60 shadow-xs">
                {getTypeIcon(notif.type)}
              </div>

              {/* Body Content */}
              <div
                className="flex-1 cursor-pointer min-w-0"
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <h3
                    className={`text-sm ${
                      !notif.isRead
                        ? 'font-bold text-stone-900 dark:text-white'
                        : 'font-semibold text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {notif.title}
                  </h3>
                  <span className="text-xs text-stone-400 shrink-0">
                    {new Date(notif.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {notif.message}
                </p>

                {notif.link && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    <span>View associated action</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                {!notif.isRead && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notif._id);
                    }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-warmdark-800"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif._id);
                  }}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-warmdark-800"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

