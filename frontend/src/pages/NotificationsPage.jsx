import React, { useState, useEffect, useMemo } from 'react';
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
  Layers,
  List,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { NOTIFICATION_TYPES } from '../services/notificationService';
import { resolveNotificationRoute } from '../utils/navigation';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import UserAvatar from '../components/common/UserAvatar';

export const NotificationsPage = () => {
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
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refreshNotifications,
  } = useSocket();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'messages' | 'job_alert' | 'application' | 'task'
  const [groupBySender, setGroupBySender] = useState(true); // WhatsApp style grouped messages

  // Refresh notifications immediately on page mount
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Group chat notifications by conversation / sender for clean WhatsApp-style cards
  const { groupedChatCards, nonChatNotifications } = useMemo(() => {
    const chatMap = new Map();
    const nonChats = [];

    notifications.forEach((notif) => {
      const isChat = notif.type === NOTIFICATION_TYPES.NEW_MESSAGE || notif.link?.includes('chat');
      if (isChat) {
        const senderId = (notif.sender?._id || notif.sender || notif.title).toString();
        const convId =
          notif.metadata?.conversationId ||
          (notif.link?.includes('conversationId=')
            ? notif.link.split('conversationId=')[1]
            : null) ||
          senderId;

        if (!chatMap.has(convId)) {
          chatMap.set(convId, {
            convId,
            sender: notif.sender,
            senderName: notif.sender?.name || notif.title.replace(/^New message from\s*/i, ''),
            senderRole: notif.sender?.role || (notif.title.includes('ADMIN') ? 'admin' : 'student'),
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
        if (!notif.isRead) group.unreadCount++;

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

    const groupedChats = Array.from(chatMap.values()).sort(
      (a, b) => b.latestDate - a.latestDate
    );

    return { groupedChatCards: groupedChats, nonChatNotifications: nonChats };
  }, [notifications]);

  // Handle opening a WhatsApp-style grouped conversation
  const handleOpenGroupedChat = (group) => {
    // Mark all notifications in this group as read
    group.notifications.forEach((n) => {
      if (!n.isRead) {
        markAsRead(n._id);
      }
    });
    const target = resolveNotificationRoute(group.link, NOTIFICATION_TYPES.NEW_MESSAGE, user?.role);
    navigate(target);
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    const target = resolveNotificationRoute(notif.link, notif.type, user?.role);
    navigate(target);
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filterType === 'unread') return !notif.isRead;
    if (filterType === 'messages') {
      return notif.type === NOTIFICATION_TYPES.NEW_MESSAGE || notif.link?.includes('chat');
    }
    if (filterType === 'job_alert') return notif.type === NOTIFICATION_TYPES.JOB_ALERT;
    if (filterType === 'application')
      return [NOTIFICATION_TYPES.APPLICATION_SUBMITTED, NOTIFICATION_TYPES.APPLICATION_STATUS].includes(notif.type);
    if (filterType === 'task')
      return [NOTIFICATION_TYPES.TASK_ASSIGNED, NOTIFICATION_TYPES.TASK_DEADLINE, NOTIFICATION_TYPES.TASK_FEEDBACK].includes(notif.type);
    return true;
  });

  const totalMessageNotifs = notifications.filter(
    (n) => n.type === NOTIFICATION_TYPES.NEW_MESSAGE || n.link?.includes('chat')
  ).length;

  const getTypeIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.NEW_MESSAGE:
        return <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case NOTIFICATION_TYPES.JOB_ALERT:
        return <Sparkles className="w-5 h-5 text-champagne-500" />;
      case NOTIFICATION_TYPES.OPPORTUNITY_PUBLISHED:
        return <Briefcase className="w-5 h-5 text-brand-500" />;
      case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
        return <FileText className="w-5 h-5 text-blue-500" />;
      case NOTIFICATION_TYPES.APPLICATION_STATUS:
        return <Clock className="w-5 h-5 text-emerald-500" />;
      case NOTIFICATION_TYPES.INTERN_ALLOCATED:
      case NOTIFICATION_TYPES.USER_REGISTERED:
        return <UserCheck className="w-5 h-5 text-indigo-500" />;
      case NOTIFICATION_TYPES.CERTIFICATE_ISSUED:
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
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

  const formatMessageTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="surface-card p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 border-peach-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                {unreadCount} Unread
              </span>
            )}
            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                Live Feed
              </span>
            ) : (
              <span className="text-xs text-stone-400">Offline</span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            WhatsApp-style direct messaging alerts, opportunity broadcasts, and system updates.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Toggle */}
          <Button
            variant="outline"
            size="sm"
            icon={soundEnabled ? Volume2 : VolumeX}
            onClick={toggleSound}
            className={`text-xs ${
              !soundEnabled
                ? 'border-rose-300 text-rose-500 hover:bg-rose-50'
                : 'border-champagne-300 hover:bg-champagne-50'
            }`}
          >
            {soundEnabled ? 'Chime On' : 'Chime Muted'}
          </Button>

          {pushPermission !== 'granted' && (
            <Button
              variant="outline"
              size="sm"
              icon={Bell}
              onClick={requestPushPermission}
              className="text-xs border-champagne-300 hover:bg-champagne-50"
            >
              Desktop Push
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
              Mark All Read
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

      {/* Filter Tabs & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-champagne-100 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-champagne-50 dark:text-stone-400'
            }`}
          >
            All ({notifications.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('messages')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'messages'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-emerald-50 dark:text-stone-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Messages ({totalMessageNotifs})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'unread'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-champagne-50 dark:text-stone-400'
            }`}
          >
            Unread ({unreadCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('job_alert')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'job_alert'
                ? 'bg-champagne-500 text-stone-900 shadow-xs'
                : 'text-stone-600 hover:bg-champagne-50 dark:text-stone-400'
            }`}
          >
            <Sparkles className="w-3 h-3 text-burgundy-600 dark:text-champagne-300" />
            <span>Opportunities</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('application')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'task'
                ? 'bg-burgundy-700 text-white shadow-xs'
                : 'text-stone-600 hover:bg-champagne-50 dark:text-stone-400'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Tasks</span>
          </button>
        </div>

        {/* View Layout Toggle: WhatsApp Grouped vs Standard Timeline */}
        {(filterType === 'all' || filterType === 'messages') && groupedChatCards.length > 0 && (
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-850 rounded-xl shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setGroupBySender(true)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                groupBySender
                  ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Group messages from same sender like WhatsApp"
            >
              <Layers className="w-3 h-3" />
              <span>WhatsApp View</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupBySender(false)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                !groupBySender
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Show each notification separately"
            >
              <List className="w-3 h-3" />
              <span>Timeline</span>
            </button>
          </div>
        )}
      </div>

      {/* WHATSAPP-STYLE GROUPED CHATS SECTION */}
      {groupBySender && (filterType === 'all' || filterType === 'messages') && groupedChatCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Active WhatsApp Direct Conversations ({groupedChatCards.length})</span>
            </h2>
            <span className="text-[11px] text-stone-400">Click to reply instantly</span>
          </div>

          <div className="surface-card divide-y divide-emerald-100/60 dark:divide-stone-800 rounded-2xl overflow-hidden border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
            {groupedChatCards.map((group) => {
              const hasUnread = group.unreadCount > 0;

              return (
                <div
                  key={group.convId}
                  onClick={() => handleOpenGroupedChat(group)}
                  className={`p-3.5 sm:p-4 transition-all group flex items-start gap-3.5 cursor-pointer border-l-4 ${
                    hasUnread
                      ? 'border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70'
                      : 'border-l-transparent hover:bg-stone-50 dark:hover:bg-warmdark-850'
                  }`}
                >
                  {/* WhatsApp Contact Avatar */}
                  <UserAvatar
                    sender={group.sender}
                    name={group.senderName}
                    size="lg"
                    isOnline={true}
                    showStatus={true}
                  />

                  {/* Conversation Information */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-sm truncate ${
                            hasUnread
                              ? 'font-extrabold text-stone-900 dark:text-white'
                              : 'font-semibold text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          {group.senderName}
                        </span>
                        {group.senderRole && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0">
                            {group.senderRole}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-medium text-stone-400">
                          {formatMessageTime(group.latestDate)}
                        </span>
                        {hasUnread && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs animate-in zoom-in-75">
                            {group.unreadCount > 9 ? '9+' : group.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* WhatsApp-Style Message Bubble Preview */}
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300">
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate font-medium">
                        {group.latestMessage}
                      </span>
                    </div>

                    {/* Context Chips if sender sent multiple messages */}
                    {group.notifications.length > 1 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          {group.notifications.length} messages received:
                        </span>
                        {group.allMessages.slice(-3).map((m, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 truncate max-w-[140px]"
                          >
                            &ldquo;{m}&rdquo;
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Quick Arrow */}
                  <div className="shrink-0 flex items-center self-center text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TIMELINE NOTIFICATIONS LIST */}
      <div className="space-y-3">
        {groupBySender && (filterType === 'all' || filterType === 'messages') && nonChatNotifications.length > 0 && (
          <div className="px-1 pt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Other Workflow & System Notifications ({nonChatNotifications.length})
            </h2>
          </div>
        )}

        <div className="surface-card divide-y divide-peach-100 dark:divide-stone-850 rounded-2xl overflow-hidden border border-peach-200">
          {isLoading && notifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-stone-400">Loading notifications...</div>
          ) : (groupBySender && filterType === 'messages' && groupedChatCards.length === 0) ||
            (!groupBySender && filteredNotifications.length === 0) ||
            (groupBySender && filterType !== 'messages' && nonChatNotifications.length === 0 && groupedChatCards.length === 0) ? (
            <EmptyState
              icon={Bell}
              title={filterType === 'unread' ? 'No unread notifications' : 'No notifications in this category'}
              description="When chat messages arrive, opportunities are published, or status updates occur, alerts appear here in real-time."
              actionText="Refresh Feed"
              onAction={refreshNotifications}
            />
          ) : (
            // Render non-chat notifications or full timeline if groupBySender is off
            (groupBySender && (filterType === 'all' || filterType === 'messages')
              ? filterType === 'messages'
                ? []
                : nonChatNotifications
              : filteredNotifications
            ).map((notif) => {
              const isChatMessage = notif.type === NOTIFICATION_TYPES.NEW_MESSAGE || notif.link?.includes('chat');

              return (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 sm:p-4 transition-colors group flex items-start gap-3.5 cursor-pointer hover:bg-peach-50/50 dark:hover:bg-warmdark-850 ${
                    !notif.isRead ? 'bg-peach-50/30 dark:bg-brand-950/20' : ''
                  }`}
                >
                  {/* Left Avatar / Type Icon */}
                  {isChatMessage ? (
                    <UserAvatar
                      sender={notif.sender}
                      name={notif.title}
                      size="md"
                      isOnline={true}
                      showStatus={true}
                    />
                  ) : (
                    <div className="shrink-0 w-10 h-10 rounded-2xl bg-peach-50 dark:bg-warmdark-800 flex items-center justify-center border border-peach-200/60 dark:border-stone-700/60 shadow-xs">
                      {getTypeIcon(notif.type)}
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3
                          className={`text-xs sm:text-sm truncate ${
                            !notif.isRead
                              ? 'font-bold text-stone-900 dark:text-white'
                              : 'font-semibold text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {notif.title}
                        </h3>
                        {notif.sender?.role && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0">
                            {notif.sender.role}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-400 shrink-0">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Actions */}
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
                        <Check className="w-3.5 h-3.5" />
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
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
