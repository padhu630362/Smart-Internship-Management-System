import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  CheckCheck,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { resolveNotificationRoute } from '../../utils/navigation';
import { chatService } from '../../services/chatService';
import UserAvatar from './UserAvatar';

const TOAST_DURATION = 9000; // 9 seconds

// 1. Direct Msg (WhatsApp style chat glyph with phone)
const DirectMsgIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2ZM16.66 15.93C16.42 16.61 15.48 17.18 14.86 17.26C14.43 17.31 13.88 17.34 11.99 16.56C9.57 15.56 8.01 13.1 7.89 12.94C7.77 12.78 6.91 11.64 6.91 10.46C6.91 9.28 7.51 8.7 7.75 8.46C7.99 8.22 8.27 8.16 8.43 8.16C8.59 8.16 8.75 8.16 8.89 8.17C9.05 8.17 9.25 8.11 9.45 8.59C9.65 9.07 10.13 10.25 10.19 10.37C10.25 10.49 10.29 10.65 10.21 10.81C10.13 10.97 10.07 11.05 9.95 11.19C9.83 11.33 9.71 11.43 9.59 11.57C9.45 11.71 9.31 11.87 9.47 12.15C9.63 12.43 10.19 13.34 11.01 14.07C12.07 15.01 12.93 15.31 13.23 15.45C13.53 15.59 13.71 15.57 13.89 15.37C14.07 15.17 14.65 14.49 14.87 14.19C15.09 13.89 15.29 13.93 15.57 14.03C15.85 14.13 17.35 14.87 17.65 15.01C17.95 15.15 18.15 15.23 18.23 15.35C18.31 15.47 18.31 16.03 18.07 16.71L16.66 15.93Z" />
  </svg>
);

// 2. Messenger (Chat with lightning bolt)
const MessengerIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.145 2 11.258C2 14.17 3.433 16.76 5.674 18.42V22L9.088 20.126C10.016 20.384 10.99 20.517 12 20.517C17.523 20.517 22 16.372 22 11.258C22 6.145 17.523 2 12 2ZM13.13 14.364L10.74 11.814L6.074 14.364L11.206 8.91L13.626 11.46L18.261 8.91L13.13 14.364Z" />
  </svg>
);

// 3. Telegram / Paper plane
const TelegramIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8L14.77 17.61C14.63 18.23 14.26 18.38 13.74 18.09L10.89 15.99L9.51 17.32C9.36 17.47 9.23 17.6 8.94 17.6L9.15 14.68L14.46 9.88C14.69 9.68 14.41 9.56 14.1 9.77L7.54 13.9L4.71 13.02C4.1 12.83 4.09 12.41 4.84 12.12L15.9 7.86C16.41 7.67 16.86 7.98 16.64 8.8Z" />
  </svg>
);

// 4. Instagram / Details camera glyph
const InstagramDetailsIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

// 5. Phone / Call with sound waves
const CallIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.45-5.15-3.76-6.59-6.59l1.97-1.57c.28-.28.37-.68.25-1.02A11.36 11.36 0 0 1 8.58 4c0-.55-.45-1-1-1H4.03c-.55 0-1 .45-1 1C3.03 13.43 10.57 21 19.98 21c.55 0 1-.45 1-1v-3.62c0-.55-.45-1-.97-1zM19 12h2a9 9 0 0 0-9-9v2a7 7 0 0 1 7 7zm-4 0h2a5 5 0 0 0-5-5v2a3 3 0 0 1 3 3z" />
  </svg>
);

const ToastItem = ({ toast, onDismiss, onOpen }) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);

  const remainingTimeRef = useRef(TOAST_DURATION);

  useEffect(() => {
    // Freeze countdown when paused or user is typing reply
    if (isPaused || showQuickReply) return;

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
  }, [isPaused, showQuickReply, onDismiss, toast.id]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  const isChatMessage =
    toast.type === 'new_message' ||
    toast.type === 'chat' ||
    toast.link?.includes('chat');

  // Clean sender name (strip "New message from " prefix if present)
  const cleanSenderName =
    toast.sender?.name ||
    (isChatMessage
      ? toast.title?.replace(/^New message from\s*/i, '').trim()
      : toast.title) ||
    'Sender';

  const senderRole = toast.sender?.role;

  // Format timestamp (e.g. "10:55")
  const formattedTime = (() => {
    if (toast.createdAt) {
      try {
        const d = new Date(toast.createdAt);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
      } catch {}
    }
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  })();

  const handleSendQuickReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || isSendingReply) return;
    try {
      setIsSendingReply(true);
      const convId = toast.metadata?.conversationId;
      if (convId) {
        await chatService.sendMessage(convId, replyText.trim());
      } else if (toast.sender?._id || toast.sender?.id) {
        const recipientId = toast.sender._id || toast.sender.id;
        const res = await chatService.createConversation({
          type: 'direct',
          recipientId,
        });
        if (res?.data?.conversation?._id) {
          await chatService.sendMessage(res.data.conversation._id, replyText.trim());
        }
      }
      setReplySent(true);
      setTimeout(() => {
        onDismiss(toast.id);
      }, 1400);
    } catch (err) {
      console.warn('Failed to send quick reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="pointer-events-auto relative w-full overflow-hidden rounded-[26px] bg-white dark:bg-[#151c28] border border-slate-200/90 dark:border-slate-800 shadow-[0_22px_70px_-15px_rgba(0,0,0,0.32)] transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in-90"
      role="alert"
    >
      {/* 1. Header with large Avatar, Name, Status, and Close icon */}
      <div className="bg-[#f8f9fa] dark:bg-[#1c2436] px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Large Avatar with Green Online Dot */}
          <div className="relative shrink-0">
            <UserAvatar
              sender={toast.sender}
              name={cleanSenderName}
              size="md"
              className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-xs"
            />
            <span
              className="w-3.5 h-3.5 bg-[#22c55e] border-2 border-white dark:border-[#1c2436] rounded-full absolute bottom-0 right-0 shadow-xs"
              title="Online"
            />
          </div>

          {/* Sender Name and Status */}
          <div className="min-w-0">
            <h4 className="text-[15px] font-bold text-slate-900 dark:text-white truncate leading-tight">
              {cleanSenderName}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Online
              </span>
              {senderRole && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    {senderRole}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-pointer"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Message Body Area */}
      <div className="p-4 pt-3 space-y-3 bg-white dark:bg-[#151c28]">
        {/* Timestamp Centered */}
        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium text-center tracking-tight">
          {formattedTime}
        </div>

        {/* Speech Bubble Row */}
        <div
          onClick={() => onOpen(toast, 'default')}
          className="flex items-start gap-2.5 cursor-pointer group"
          title="Click to open conversation"
        >
          {/* Small Sender Avatar */}
          <UserAvatar
            sender={toast.sender}
            name={cleanSenderName}
            size="xs"
            className="w-7 h-7 rounded-full shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700"
          />

          {/* Chat Speech Bubble */}
          <div className="bg-[#f0f2f5] dark:bg-[#20293d] group-hover:bg-[#e8ebef] dark:group-hover:bg-[#273249] transition-colors text-slate-800 dark:text-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed shadow-2xs max-w-[85%]">
            {isChatMessage ? (
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white text-xs">
                  Hi there 👋
                </p>
                <p className="text-slate-700 dark:text-slate-200 text-xs">
                  {toast.message}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {toast.title && (
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                    {toast.title}
                  </h5>
                )}
                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3">
                  {toast.message}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Reply Form Drawer */}
        {showQuickReply && (
          <form onSubmit={handleSendQuickReply} className="pt-1 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            {replySent ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Reply sent to {cleanSenderName}!</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${cleanSenderName}...`}
                  autoFocus
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  className="p-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  title="Send Reply"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>
        )}

        {/* 3. Five Bottom Action Buttons matching the user's screenshot */}
        <div className="pt-2 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* 1. Direct Msg (Green) */}
          <button
            type="button"
            onClick={() => onOpen(toast, 'direct')}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white flex items-center justify-center shadow-md hover:scale-108 active:scale-95 transition-all group relative cursor-pointer"
            title="Direct Msg"
            aria-label="Direct Msg"
          >
            <DirectMsgIcon className="w-5 h-5 text-white" />
            <span className="absolute -top-7 px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm">
              Direct Msg
            </span>
          </button>

          {/* 2. Messenger / Open Chat (Blue) */}
          <button
            type="button"
            onClick={() => onOpen(toast, 'chat')}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#0084ff] hover:bg-[#0070d6] text-white flex items-center justify-center shadow-md hover:scale-108 active:scale-95 transition-all group relative cursor-pointer"
            title="Open Chat"
            aria-label="Open Chat"
          >
            <MessengerIcon className="w-5 h-5 text-white" />
            <span className="absolute -top-7 px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm">
              Open Chat
            </span>
          </button>

          {/* 3. Telegram / Quick Reply (Sky Blue) */}
          <button
            type="button"
            onClick={() => setShowQuickReply((prev) => !prev)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${
              showQuickReply ? 'bg-[#0369a1] ring-2 ring-sky-300' : 'bg-[#0284c7] hover:bg-[#0369a1]'
            } text-white flex items-center justify-center shadow-md hover:scale-108 active:scale-95 transition-all group relative cursor-pointer`}
            title="Quick Reply"
            aria-label="Quick Reply"
          >
            <TelegramIcon className="w-5 h-5 text-white" />
            <span className="absolute -top-7 px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm">
              Quick Reply
            </span>
          </button>

          {/* 4. Instagram / Details (Blue) */}
          <button
            type="button"
            onClick={() => onOpen(toast, 'details')}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#0099ff] hover:bg-[#0080d9] text-white flex items-center justify-center shadow-md hover:scale-108 active:scale-95 transition-all group relative cursor-pointer"
            title="View Details"
            aria-label="View Details"
          >
            <InstagramDetailsIcon className="w-5 h-5 text-white" />
            <span className="absolute -top-7 px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm">
              View Details
            </span>
          </button>

          {/* 5. Call / Contact (Purple) */}
          <button
            type="button"
            onClick={() => onOpen(toast, 'call')}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white flex items-center justify-center shadow-md hover:scale-108 active:scale-95 transition-all group relative cursor-pointer"
            title="Call / Contact"
            aria-label="Call / Contact"
          >
            <CallIcon className="w-5 h-5 text-white" />
            <span className="absolute -top-7 px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm">
              Contact
            </span>
          </button>
        </div>
      </div>

      {/* Auto-Dismiss Linear Progress Indicator */}
      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 transition-all duration-75 linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const NotificationToastContainer = () => {
  const { toasts, dismissToast, markAsRead, markConversationNotificationsRead } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleOpen = (toast, actionType = 'default') => {
    if (toast.id) {
      markAsRead(toast.id);
    }
    const convId = toast.metadata?.conversationId;
    if (convId) {
      markConversationNotificationsRead(convId);
    }
    dismissToast(toast.id);

    if (actionType === 'direct' || actionType === 'chat') {
      if (convId) {
        navigate(`/chat?conversationId=${convId}`);
      } else if (toast.sender?._id || toast.sender?.id) {
        navigate(`/chat?userId=${toast.sender._id || toast.sender.id}`);
      } else {
        navigate('/chat');
      }
      return;
    }

    if (actionType === 'call') {
      const phone = toast.sender?.profile?.phone;
      const email = toast.sender?.email;
      if (phone) {
        window.open(`tel:${phone}`);
      } else if (email) {
        window.open(`mailto:${email}`);
      } else {
        navigate('/chat');
      }
      return;
    }

    const targetUrl = resolveNotificationRoute(toast.link, toast.type, user?.role);
    if (targetUrl && targetUrl !== window.location.pathname) {
      navigate(targetUrl);
    }
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none max-w-[340px] sm:max-w-[360px] w-full"
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
