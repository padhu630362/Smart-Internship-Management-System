import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Sparkles,
  Briefcase,
  FileText,
  Calendar,
  ShieldCheck,
  Megaphone,
  Bell,
  X,
  ExternalLink,
  ArrowRight,
  UserCheck,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { resolveNotificationRoute } from '../../utils/navigation';
import { NOTIFICATION_TYPES } from '../../services/notificationService';
import UserAvatar from './UserAvatar';

const TOAST_DURATION = 6500; // 6.5 seconds

const ToastItem = ({ toast, onDismiss, onOpen }) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(TOAST_DURATION);

  useEffect(() => {
    if (isPaused) return;

    const interval = 50;
    const timer = setInterval(() => {
      remainingTimeRef.current -= interval;
      const pct = Math.max(0, (remainingTimeRef.current / TOAST_DURATION) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(timer);
        onDismiss(toast.id);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, onDismiss, toast.id]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  const isChatMessage =
    toast.type === NOTIFICATION_TYPES.NEW_MESSAGE ||
    toast.type === 'new_message' ||
    toast.link?.includes('chat');

  const getTypeStyles = (type) => {
    if (isChatMessage) {
      return {
        icon: MessageSquare,
        badgeBg:
          'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        accentBorder: 'border-l-emerald-500',
        progressBar: 'bg-emerald-500',
        tag: 'Direct Message',
      };
    }

    switch (type) {
      case NOTIFICATION_TYPES.JOB_ALERT:
      case 'job_alert':
        return {
          icon: Sparkles,
          badgeBg:
            'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          accentBorder: 'border-l-amber-500',
          progressBar: 'bg-amber-500',
          tag: 'Opportunity Alert',
        };
      case NOTIFICATION_TYPES.OPPORTUNITY_PUBLISHED:
        return {
          icon: Briefcase,
          badgeBg:
            'bg-brand-100 dark:bg-brand-950/70 text-brand-600 dark:text-brand-300 border-brand-200 dark:border-brand-800',
          accentBorder: 'border-l-brand-600',
          progressBar: 'bg-brand-600',
          tag: 'New Internship',
        };
      case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
      case NOTIFICATION_TYPES.APPLICATION_STATUS:
        return {
          icon: FileText,
          badgeBg:
            'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          accentBorder: 'border-l-blue-500',
          progressBar: 'bg-blue-500',
          tag: 'Application Update',
        };
      case NOTIFICATION_TYPES.INTERN_ALLOCATED:
        return {
          icon: UserCheck,
          badgeBg:
            'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          accentBorder: 'border-l-indigo-500',
          progressBar: 'bg-indigo-500',
          tag: 'Intern Allocated',
        };
      case NOTIFICATION_TYPES.CERTIFICATE_ISSUED:
        return {
          icon: ShieldCheck,
          badgeBg:
            'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          accentBorder: 'border-l-emerald-500',
          progressBar: 'bg-emerald-500',
          tag: 'Certificate Issued',
        };
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
      case NOTIFICATION_TYPES.TASK_DEADLINE:
        return {
          icon: Calendar,
          badgeBg:
            'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          accentBorder: 'border-l-rose-500',
          progressBar: 'bg-rose-500',
          tag: 'Task Notice',
        };
      default:
        return {
          icon: Bell,
          badgeBg:
            'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700',
          accentBorder: 'border-l-emerald-600',
          progressBar: 'bg-emerald-600',
          tag: 'Notification',
        };
    }
  };

  const style = getTypeStyles(toast.type);
  const IconComponent = style.icon;

  // Clean sender name (strip "New message from " prefix if present)
  const cleanSenderName =
    toast.sender?.name ||
    (isChatMessage
      ? toast.title?.replace(/^New message from\s*/i, '').trim()
      : toast.title);

  const senderRole = toast.sender?.role;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto relative overflow-hidden w-full max-w-sm rounded-2xl bg-white/95 dark:bg-[#181115]/95 backdrop-blur-md border border-stone-200/90 dark:border-stone-800 shadow-2xl transition-all duration-300 border-l-4 ${style.accentBorder} animate-in slide-in-from-top-3 fade-in-80`}
      role="alert"
    >
      <div className="p-3.5 sm:p-4">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Sender Avatar or Type Icon */}
            {isChatMessage ? (
              <UserAvatar
                sender={toast.sender}
                name={cleanSenderName}
                size="sm"
                isOnline={true}
                showStatus={true}
              />
            ) : toast.sender?.profile?.avatarUrl ? (
              <UserAvatar sender={toast.sender} name={cleanSenderName} size="sm" />
            ) : (
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 ${style.badgeBg}`}
              >
                <IconComponent className="w-3.5 h-3.5" />
              </div>
            )}

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                {cleanSenderName || style.tag}
              </span>
              {senderRole && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0">
                  {senderRole}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-medium text-stone-400">Just now</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus:outline-none"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message Content */}
        <div
          onClick={() => onOpen(toast)}
          className="cursor-pointer group rounded-lg transition-colors"
        >
          {isChatMessage ? (
            <div className="flex items-center gap-1.5 text-xs text-stone-800 dark:text-stone-200 mt-1 font-medium bg-emerald-50/50 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-100/60 dark:border-emerald-900/40">
              <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="truncate">{toast.message}</span>
            </div>
          ) : (
            <>
              <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-champagne-300 transition-colors">
                {toast.title}
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </>
          )}

          {/* Quick Action Button */}
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>{isChatMessage ? 'Reply in WhatsApp Chat' : 'View Details'}</span>
              <ArrowRight className="w-3 h-3" />
            </span>
            <span className="text-[10px] font-normal text-stone-400 group-hover:underline">
              Click to open
            </span>
          </div>
        </div>
      </div>

      {/* Auto-Dismiss Linear Progress Indicator */}
      <div className="h-1 w-full bg-stone-100 dark:bg-stone-850 overflow-hidden">
        <div
          className={`h-full transition-all duration-75 linear ${style.progressBar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const NotificationToastContainer = () => {
  const { toasts, dismissToast, markAsRead } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleOpen = (toast) => {
    if (toast.id) {
      markAsRead(toast.id);
    }
    dismissToast(toast.id);
    const targetUrl = resolveNotificationRoute(toast.link, toast.type, user?.role);
    navigate(targetUrl);
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 sm:top-5 sm:right-6 z-[9999] flex flex-col items-end gap-2.5 pointer-events-none max-w-sm w-full"
    >
      {toasts.slice(0, 4).map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
          onOpen={handleOpen}
        />
      ))}
    </div>
  );
};

export default NotificationToastContainer;
