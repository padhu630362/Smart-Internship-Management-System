import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Volume2,
  VolumeX,
  X,
  ArrowRight,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { NOTIFICATION_TYPES } from '../../services/notificationService';
import { resolveNotificationRoute } from '../../utils/navigation';
import UserAvatar from './UserAvatar';

export const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    pushPermission,
    soundEnabled,
    toggleSound,
    requestPushPermission,
    markAsRead,
    markConversationNotificationsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useSocket();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'chat'
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

  // Consolidate direct chat notifications by sender / conversation
  const { groupedChatCards, nonChatNotifications } = useMemo(() => {
    const chatMap = new Map();
    const nonChats = [];

    notifications.forEach((notif) => {
      const isChat = notif.type === NOTIFICATION_TYPES.NEW_MESSAGE || notif.link?.includes('chat');
      if (isChat) {
        // Ephemeral chat messages disappear once checked/read
        if (notif.isRead) return;

        const senderId = (notif.sender?._id || notif.sender || notif.title).toString();
        const convId =
          notif.metadata?.conversationId ||
          (notif.link?.includes('conversationId=')
            ? notif.link.split('conversationId=')[1]
            : null) ||
          senderId;

        if (!chatMap.has(convId)) {
          // Clean sender name (strip "New message from " if present)
          const cleanSenderName =
            notif.sender?.name || notif.title.replace(/^New message from\s*/i, '').trim();

          chatMap.set(convId, {
            convId,
            sender: notif.sender,
            senderName: cleanSenderName,
            senderRole: notif.sender?.role || (notif.title.includes('ADMIN') ? 'admin' : null),
            link: notif.link || `/chat?conversationId=${convId}`,
            notifications: [],
            latestDate: new Date(notif.createdAt),
            unreadCount: 0,
            latestMessage: notif.message,
            allMessages: [],
          });
        }

        const group = chatMap.get(convId);
        group.notifications.push(notif);
        group.allMessages.push(notif.message);
        group.unreadCount++;

        const itemDate = new Date(notif.createdAt);
        if (itemDate >= group.latestDate) {
          group.latestDate = itemDate;
          group.latestMessage = notif.message;
          if (notif.sender) group.sender = notif.sender;
        }
      } else {
        nonChats.push(notif);
      }
    });

    const groupedChats = Array.from(chatMap.values())
      .filter((g) => g.unreadCount > 0)
      .sort((a, b) => b.latestDate - a.latestDate);

    return { groupedChatCards: groupedChats, nonChatNotifications: nonChats };
  }, [notifications]);

  // Handle clicking direct chat consolidated card
  const handleOpenGroupedChat = (group) => {
    markConversationNotificationsRead(group.convId);
    setIsOpen(false);
    const target = resolveNotificationRoute(group.link, NOTIFICATION_TYPES.NEW_MESSAGE, user?.role);
    navigate(target);
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    setIsOpen(false);
    const target = resolveNotificationRoute(notif.link, notif.type, user?.role);
    if (target && target !== window.location.pathname) {
      navigate(target);
    }
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
        return <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case NOTIFICATION_TYPES.JOB_ALERT:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case NOTIFICATION_TYPES.OPPORTUNITY_PUBLISHED:
        return <Briefcase className="w-4 h-4 text-brand-500" />;
      case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
        return <FileText className="w-4 h-4 text-blue-500" />;
      case NOTIFICATION_TYPES.APPLICATION_STATUS:
        return <Clock className="w-4 h-4 text-emerald-500" />;
      case NOTIFICATION_TYPES.INTERN_ALLOCATED:
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

  // Filter logic
  const displayChatGroups =
    filter === 'unread'
      ? groupedChatCards.filter((g) => g.unreadCount > 0)
      : filter === 'chat' || filter === 'all'
      ? groupedChatCards
      : [];

  const displayNonChats =
    filter === 'unread'
      ? nonChatNotifications.filter((n) => !n.isRead)
      : filter === 'chat'
      ? []
      : nonChatNotifications;

  const totalDisplayItems = displayChatGroups.length + displayNonChats.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="notification-bell-button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl border border-peach-200/80 dark:border-stone-750 hover:bg-peach-50/80 dark:hover:bg-warmdark-850 text-stone-600 dark:text-stone-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-sm animate-in zoom-in-75 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Live Socket Status Pip */}
        <span
          title={isConnected ? 'Real-Time WebSocket Active' : 'Reconnecting to Live Feed'}
          className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-warmdark-900 ${
            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-warmdark-900 border border-peach-200 dark:border-stone-800 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-peach-100 dark:border-stone-800 flex items-center justify-between gap-2 bg-gradient-to-r from-emerald-50/60 via-peach-50/40 to-white dark:from-warmdark-850 dark:to-warmdark-900">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-white">Notifications</h3>
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
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-warmdark-800 transition-colors"
                title={soundEnabled ? 'Mute notification chimes' : 'Enable notification chimes'}
                aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                )}
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  id="mark-all-read-btn"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-warmdark-800 transition-colors"
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
            <div className="px-3.5 py-2 bg-emerald-50/70 dark:bg-warmdark-850 border-b border-emerald-100 dark:border-stone-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-stone-800 dark:text-emerald-200 font-medium">
                Enable desktop browser notifications?
              </span>
              <button
                type="button"
                onClick={requestPushPermission}
                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors"
              >
                Enable
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="px-3 pt-2 pb-1.5 bg-stone-50/80 dark:bg-warmdark-850 border-b border-peach-100 dark:border-stone-800 flex gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-warmdark-800 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              All ({groupedChatCards.length + nonChatNotifications.length})
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
            <button
              type="button"
              onClick={() => setFilter('chat')}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                filter === 'chat'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Direct Msg ({groupedChatCards.length})</span>
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-peach-100/70 dark:divide-stone-850">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">Loading notifications...</div>
            ) : totalDisplayItems === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-peach-50 dark:bg-warmdark-800 flex items-center justify-center mx-auto text-peach-400 mb-2">
                  <Bell className="w-5 h-5 opacity-70" />
                </div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {filter === 'unread'
                    ? 'No unread notifications'
                    : filter === 'chat'
                    ? 'No direct messages yet'
                    : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Direct chat messages and company updates appear here in real time.
                </p>
              </div>
            ) : (
              <>
                {/* 1. DIRECT CHAT GROUPED CARDS */}
                {displayChatGroups.map((group) => {
                  const hasUnread = group.unreadCount > 0;

                  return (
                    <div
                      key={group.convId}
                      onClick={() => handleOpenGroupedChat(group)}
                      className={`p-3 text-xs transition-all group flex items-start gap-3 cursor-pointer border-l-4 ${
                        hasUnread
                          ? 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50/80'
                          : 'border-l-transparent hover:bg-peach-50/50 dark:hover:bg-warmdark-850/60'
                      }`}
                    >
                      {/* Resilient Contact Avatar */}
                      <UserAvatar
                        sender={group.sender}
                        name={group.senderName}
                        isOnline={true}
                        showStatus={true}
                        size="sm"
                        className="mt-0.5"
                      />

                      {/* Direct Message Snippet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`truncate ${
                                hasUnread
                                  ? 'font-bold text-stone-900 dark:text-white'
                                  : 'font-semibold text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {group.senderName}
                            </span>
                            {group.senderRole && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0">
                                {group.senderRole}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400 shrink-0">
                            {formatRelativeTime(group.latestDate)}
                          </span>
                        </div>

                        {/* Direct Message Preview with Double Check */}
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <div className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-300 truncate min-w-0">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate font-medium">{group.latestMessage}</span>
                          </div>

                          {/* Unread Count Pill */}
                          {hasUnread && (
                            <span className="px-1.5 py-0.2 min-w-4 text-center rounded-full text-[10px] font-bold bg-emerald-600 text-white shrink-0 shadow-xs animate-in zoom-in-75">
                              {group.unreadCount > 9 ? '9+' : group.unreadCount}
                            </span>
                          )}
                        </div>

                        {/* Extra Context Chip if multiple messages from same sender */}
                        {group.notifications.length > 1 && (
                          <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <span>{group.notifications.length} messages received</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Navigate Arrow */}
                      <div className="shrink-0 self-center text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}

                {/* 2. NON-CHAT WORKFLOW & SYSTEM NOTIFICATIONS */}
                {displayNonChats.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-3 text-xs transition-colors group flex items-start gap-3 hover:bg-peach-50/60 dark:hover:bg-warmdark-850/60 ${
                      !notif.isRead ? 'bg-peach-50/40 dark:bg-brand-950/20' : ''
                    }`}
                  >
                    {/* Icon Badge */}
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
                    </div>

                    {/* Actions */}
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
                ))}
              </>
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
