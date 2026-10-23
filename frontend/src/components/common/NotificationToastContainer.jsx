import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Award, Briefcase, CheckSquare, MessageSquare, Megaphone } from 'lucide-react';
import SimsLogo from './SimsLogo';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { resolveNotificationRoute } from '../../utils/navigation';

/**
 * Returns contextual icon and background gradients corresponding to notification type
 */
const getCategoryMetadata = (type) => {
  switch (type) {
    case 'certificate_issued':
      return {
        icon: Award,
        domain: 'certificates.internhub.local',
        bgGradient: 'from-amber-950 via-neutral-900 to-stone-900',
      };
    case 'task_assigned':
    case 'task_submitted':
    case 'task_reviewed':
      return {
        icon: CheckSquare,
        domain: 'tasks.internhub.local',
        bgGradient: 'from-blue-950 via-slate-900 to-neutral-900',
      };
    case 'application_received':
    case 'application_status':
    case 'opportunity_published':
      return {
        icon: Briefcase,
        domain: 'careers.internhub.local',
        bgGradient: 'from-emerald-950 via-neutral-900 to-slate-900',
      };
    case 'new_message':
      return {
        icon: MessageSquare,
        domain: 'chat.internhub.local',
        bgGradient: 'from-purple-950 via-neutral-900 to-stone-900',
      };
    case 'mentor_announcement':
    case 'system_announcement':
      return {
        icon: Megaphone,
        domain: 'announcements.internhub.local',
        bgGradient: 'from-rose-950 via-neutral-900 to-stone-900',
      };
    default:
      return {
        icon: Bell,
        domain: 'portal.internhub.local',
        bgGradient: 'from-slate-900 via-neutral-900 to-zinc-950',
      };
  }
};

const ToastItem = ({ toast, onDismiss, onOpen }) => {
  const category = getCategoryMetadata(toast.type);
  const CategoryIcon = category.icon;
  const domainText = toast.metadata?.domain || category.domain;

  return (
    <div
      className="pointer-events-auto relative w-full rounded-2xl bg-white dark:bg-[#1a1a1f] border border-neutral-200/90 dark:border-neutral-800 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.35)] dark:shadow-[0_24px_60px_-10px_rgba(0,0,0,0.85)] overflow-hidden select-none transition-all duration-300 animate-in fade-in"
      role="alert"
    >
      {/* 1. Official InternHub Brand Header Banner */}
      <div
        onClick={() => onOpen(toast)}
        className="relative w-full h-[110px] sm:h-[120px] bg-gradient-to-br from-stone-100 via-burgundy-50/40 to-champagne-50/50 dark:from-[#1b1922] dark:via-[#221c28] dark:to-[#17151d] border-b border-stone-200/80 dark:border-neutral-800/80 flex items-center justify-center cursor-pointer overflow-hidden group"
      >
        {/* Subtle geometric dot grid pattern */}
        <div className="absolute inset-0 opacity-25 dark:opacity-10 bg-[radial-gradient(#722f37_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Centered Official InternHub Logo */}
        <div className="relative z-10 px-5 py-2.5 rounded-2xl bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200/80 dark:border-stone-700/80 shadow-xs transition-transform duration-300 group-hover:scale-105">
          <SimsLogo size="md" className="gap-2.5" />
        </div>
      </div>

      {/* 2. Notification Text Body */}
      <div
        onClick={() => onOpen(toast)}
        className="px-4 pt-3 pb-2 cursor-pointer group"
      >
        {/* Title row with Category Icon */}
        <div className="flex items-start gap-1.5 mt-1">
          <CategoryIcon className="w-4 h-4 shrink-0 mt-0.5 text-burgundy-700 dark:text-champagne-400" />
          <h5 className="text-[13px] sm:text-[14px] font-bold text-neutral-900 dark:text-white leading-snug group-hover:text-burgundy-700 dark:group-hover:text-champagne-300 transition-colors">
            {toast.title || 'Platform Notification'}
          </h5>
        </div>

        {/* Message body */}
        <p className="mt-1 text-[12px] text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-3">
          {toast.message}
        </p>

        {/* Source metadata row */}
        <p className="mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500 font-normal truncate">
          {domainText}
        </p>
      </div>

      {/* 4. Exactly Two Action Buttons: Dismiss and Open */}
      <div className="px-4 pb-3.5 pt-1.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(toast.id);
          }}
          className="w-full py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-[13px] font-medium text-center transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-400"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(toast);
          }}
          className="w-full py-2 px-3 rounded-xl bg-burgundy-700 hover:bg-burgundy-800 dark:bg-burgundy-600 dark:hover:bg-burgundy-500 text-white text-[13px] font-semibold text-center transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-burgundy-400"
        >
          Open
        </button>
      </div>
    </div>
  );
};

export const NotificationToastContainer = () => {
  const { toasts, dismissToast, markAsRead, markConversationNotificationsRead } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleOpen = (toast) => {
    if (toast.id) {
      if (typeof markAsRead === 'function') {
        markAsRead(toast.id);
      }
    }
    const convId = toast.metadata?.conversationId;
    if (convId && typeof markConversationNotificationsRead === 'function') {
      markConversationNotificationsRead(convId);
    }
    dismissToast(toast.id);

    const targetUrl = resolveNotificationRoute(toast.link, toast.type, user?.role);
    const destination = targetUrl || '/notifications';
    if (destination !== window.location.pathname) {
      navigate(destination);
    }
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-[99999] flex flex-col items-end gap-3 pointer-events-none w-[calc(100vw-24px)] max-w-[340px] sm:max-w-[360px]"
    >
      {toasts.slice(0, 3).map((toast) => (
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
