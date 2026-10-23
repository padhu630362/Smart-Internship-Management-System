import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';
import chatService from '../services/chatService';
import soundManager from '../utils/audio';
import {
  showDesktopNotification,
  requestDesktopNotificationPermission,
  registerServiceWorker,
  syncPushSubscription,
  getDesktopNotificationPermission,
} from '../utils/desktopNotification';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [totalChatUnread, setTotalChatUnread] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [activeChatConversationId, setActiveChatConversationIdState] = useState(null);
  const [soundEnabled, setSoundEnabledState] = useState(soundManager.isSoundEnabled());
  const [pushPermission, setPushPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const socketRef = useRef(null);
  const activeChatConvRef = useRef(null);
  const recentToastedMessagesRef = useRef(new Set());

  const setActiveChatConversationId = useCallback((convId) => {
    activeChatConvRef.current = convId ? convId.toString() : null;
    setActiveChatConversationIdState(convId ? convId.toString() : null);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabledState((prev) => {
      const next = !prev;
      soundManager.setSoundEnabled(next);
      return next;
    });
  }, []);

  const dismissedToastIdsRef = useRef(new Set());

  const dismissToast = useCallback((id) => {
    if (id) {
      dismissedToastIdsRef.current.add(id.toString());
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toastData) => {
    if (!toastData || !toastData.id) return;
    const idStr = toastData.id.toString();
    if (dismissedToastIdsRef.current.has(idStr)) return;
    setToasts((prev) => {
      if (prev.some((t) => t.id === toastData.id)) return prev;
      return [toastData, ...prev.slice(0, 3)];
    });
  }, []);

  // Request browser desktop system notification permission following user action
  const requestPushPermission = useCallback(async () => {
    try {
      const permission = await requestDesktopNotificationPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        showDesktopNotification({
          title: 'InternHub Desktop Notifications Active',
          body: 'You are now ready to receive real-time system alerts on your desktop.',
          link: '/notifications',
          tag: 'internhub_enabled',
        }).catch(() => {});
      }
      return permission;
    } catch (err) {
      console.warn('Failed to request desktop notification permission:', err);
      return 'denied';
    }
  }, []);

  // Fetch unread count & initial recent notifications
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const [countRes, listRes] = await Promise.all([
        notificationService.getUnreadCount(),
        notificationService.getNotifications({ page: 1, limit: 30 }),
      ]);
      setUnreadCount(countRes?.data?.unreadCount || 0);
      setNotifications(listRes?.data?.notifications || []);
    } catch (err) {
      console.warn('Failed to fetch initial notifications:', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch total unread count across all chat conversations
  const refreshChatUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await chatService.getConversations();
      if (res?.data?.conversations) {
        const sum = res.data.conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setTotalChatUnread(sum);
      }
    } catch (err) {
      console.warn('Failed to fetch chat conversations for unread count:', err?.message);
    }
  }, [isAuthenticated]);

  // Unified, deduplicated dispatcher for incoming chat message alerts across the app
  const alertIncomingChatMessage = useCallback(({
    conversationId,
    messageId,
    senderName,
    content,
    attachments,
    sender,
    createdAt,
  }) => {
    if (!conversationId) return;
    const cidStr = conversationId.toString();
    const msgIdStr = messageId ? messageId.toString() : null;

    // Check if recipient is actively viewing this open conversation in visible, focused tab
    const isWindowFocused =
      typeof document !== 'undefined' &&
      (typeof document.hasFocus !== 'function' || document.hasFocus() || Boolean(window.__mockWindowFocus));
    const isDocumentActive =
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      isWindowFocused;
    const isCurrentActiveChat = activeChatConvRef.current === cidStr;
    const isActivelyViewing = isCurrentActiveChat && isDocumentActive;
    const isDuplicate = msgIdStr ? recentToastedMessagesRef.current.has(msgIdStr) : false;

    if (import.meta.env.DEV) {
      console.log('[NOTIF_DEBUG:3_SUPPRESSION]', JSON.stringify({
        messageId: msgIdStr,
        conversationId: cidStr,
        activeChatConvRef: activeChatConvRef.current,
        isCurrentActiveChat,
        visibilityState: typeof document !== 'undefined' ? document.visibilityState : 'unknown',
        isWindowFocused,
        isActivelyViewing,
        isDuplicate,
        action: isActivelyViewing ? 'SUPPRESS_ACTIVELY_VIEWING' : (isDuplicate ? 'SUPPRESS_DUPLICATE' : 'ALLOW_ALERT'),
      }));
    }

    if (isActivelyViewing) {
      // User is actively reading and chatting in this thread; suppress notification
      return;
    }

    // Deduplication check: ensure each message ID is alerted only once across both socket events
    if (msgIdStr) {
      if (recentToastedMessagesRef.current.has(msgIdStr)) {
        return;
      }
      recentToastedMessagesRef.current.add(msgIdStr);
      setTimeout(() => {
        recentToastedMessagesRef.current.delete(msgIdStr);
      }, 15000);
    }

    setTotalChatUnread((prev) => prev + 1);

    // Play pleasant notification audio chime
    soundManager.playNotificationChime();

    const resolvedSenderName = senderName || sender?.name || 'InternHub Contact';
    const msgPreview = content
      ? (content.length > 100 ? `${content.slice(0, 100)}...` : content)
      : (attachments?.length ? `📎 ${attachments[0]?.fileName || 'Attachment'}` : 'Sent you a message.');

    // 1. Dispatch genuine native OS desktop notification (works in Google Chrome & Microsoft Edge on Windows)
    showDesktopNotification({
      title: `New message received — ${resolvedSenderName}`,
      body: msgPreview,
      link: `/chat?conversationId=${cidStr}`,
      tag: `chat_${cidStr}_${msgIdStr || Date.now()}`,
      metadata: { conversationId: cidStr, messageId: msgIdStr },
    }).catch(() => {});

    // 2. In-app toast appears only when document is visible (if user is in another tab or minimized, in-app toast is suppressed in favor of native OS popup)
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      addToast({
        id: `chat-${msgIdStr || Date.now()}`,
        type: 'new_message',
        title: `New message from ${resolvedSenderName}`,
        message: msgPreview,
        link: `/chat?conversationId=${cidStr}`,
        sender,
        metadata: { conversationId: cidStr, messageId: msgIdStr },
        createdAt: createdAt || new Date(),
      });
    }
  }, [addToast]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      setOnlineUsers(new Set());
      setTotalChatUnread(0);
      setToasts([]);
      return;
    }

    // Register Service Worker and sync push subscription if permission already granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      registerServiceWorker().then((reg) => {
        if (reg) syncPushSubscription(reg).catch(() => {});
      }).catch(() => {});
    }

    refreshNotifications();
    refreshChatUnread();

    // Determine backend socket URL
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setIsConnected(true);
      if (typeof window !== 'undefined') {
        window.__simsSocketConnected = true;
      }

      // Automatically join active conversation room if already open
      if (activeChatConvRef.current) {
        newSocket.emit('conversation:join', { conversationId: activeChatConvRef.current });
      }

      // Query currently online users list on connection
      newSocket.emit('users:get_online', (res) => {
        if (res?.onlineUserIds && Array.isArray(res.onlineUserIds)) {
          setOnlineUsers(new Set(res.onlineUserIds));
        }
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      if (typeof window !== 'undefined') {
        window.__simsSocketConnected = false;
      }
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
    });

    // Track user online/offline status in real-time
    newSocket.on('user:status', ({ userId, status }) => {
      if (!userId) return;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') {
          next.add(userId.toString());
        } else {
          next.delete(userId.toString());
        }
        return next;
      });
    });

    // Handle incoming real-time notifications with deduplication, in-app toast popup & desktop push
    newSocket.on('notification:new', (notification) => {
      if (import.meta.env.DEV) {
        console.log('[NOTIF_DEBUG:1_SOCKET_EVENT]', JSON.stringify({
          event: 'notification:new',
          type: notification?.type,
          notifId: notification?._id || notification?.id,
          conversationId: notification?.metadata?.conversationId?.toString(),
          messageId: notification?.metadata?.messageId?.toString(),
        }));
      }
      if (!notification) return;
      const notifId = (notification._id || notification.id)?.toString();
      if (!notifId) return;

      const isTest = Boolean(notification.metadata?.isTest);
      if (isTest) {
        // Dedicated test desktop notification: trigger native OS system alert, bypass in-app toast & unread counter
        showDesktopNotification({
          title: notification.title || 'InternHub Desktop Notification Test',
          body: notification.message || 'Real-time desktop system alerts are active and working on your device!',
          link: notification.link || '/notifications',
          tag: `test_notification_${notification._id || Date.now()}`,
          metadata: notification.metadata,
        }).catch(() => {});
        return;
      }

      const isMsg = notification.type === 'new_message';
      const convId = notification.metadata?.conversationId?.toString();

      // Check if recipient is actively viewing this open conversation in visible, focused tab
      const isWindowFocused =
        typeof document !== 'undefined' &&
        (typeof document.hasFocus !== 'function' || document.hasFocus() || Boolean(window.__mockWindowFocus));
      const isDocumentActive =
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        isWindowFocused;
      const isCurrentActiveChat = isMsg && convId && activeChatConvRef.current === convId;
      const isActivelyViewing = isCurrentActiveChat && isDocumentActive;

      if (isActivelyViewing) {
        // Recipient is actively viewing this open conversation in a focused tab; auto-mark read and suppress alert
        notification.isRead = true;
        setNotifications((prev) => {
          const filtered = prev.filter((n) => n._id !== notification._id);
          return [notification, ...filtered];
        });
        notificationService.markAsRead(notification._id).catch(() => {});
        return;
      }

      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === notification._id);
        if (exists) return prev;
        return [notification, ...prev];
      });

      setUnreadCount((prev) => prev + 1);

      // If this is a chat message, route through the unified, deduplicated dispatcher
      if (isMsg) {
        alertIncomingChatMessage({
          conversationId: convId,
          messageId: notification.metadata?.messageId,
          senderName: notification.sender?.name || notification.title?.replace(/^New message from\s*/i, ''),
          content: notification.message,
          attachments: [],
          sender: notification.sender,
          createdAt: notification.createdAt,
        });
        return;
      }

      // Play pleasant audio chime for non-chat notifications
      soundManager.playNotificationChime();

      // Show real-time interactive in-app popup toast for non-chat platform notifications
      addToast({
        id: notifId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        sender: notification.sender,
        metadata: notification.metadata,
        createdAt: notification.createdAt || new Date(),
      });

      // Trigger genuine native desktop system notification
      showDesktopNotification({
        title: notification.title || 'InternHub Notification',
        body: notification.message || 'A new update is available in your portal.',
        link: notification.link || '/notifications',
        tag: `notif_${notifId}`,
        metadata: notification.metadata,
      }).catch(() => {});
    });

    // Cross-tab real-time sync when notifications are read or cleared anywhere
    newSocket.on('notification:read', (data) => {
      if (!data) return;

      if (data.all) {
        setNotifications((prev) =>
          prev
            .filter((n) => n.type !== 'new_message' && !n.link?.includes('chat'))
            .map((n) => ({ ...n, isRead: true, readAt: new Date() }))
        );
        setUnreadCount(0);
        refreshChatUnread();
      } else if (data.notificationId) {
        const nid = data.notificationId.toString();
        if (data.deleted) {
          setNotifications((prev) => prev.filter((n) => (n._id || n.id)?.toString() !== nid));
        } else {
          setNotifications((prev) =>
            prev.map((n) => ((n._id || n.id)?.toString() === nid ? { ...n, isRead: true, readAt: new Date() } : n))
          );
        }
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        } else {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      } else if (data.conversationId) {
        const cid = data.conversationId.toString();
        setNotifications((prev) =>
          prev.filter((n) => {
            const matches =
              n.metadata?.conversationId?.toString() === cid ||
              n.link?.includes(cid);
            return !matches;
          })
        );
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
        refreshChatUnread();
      } else if (data.deletedId) {
        const did = data.deletedId.toString();
        setNotifications((prev) => prev.filter((n) => n._id !== did));
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      } else if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    });

    // Handle real-time direct & group chat incoming message alerts across the app
    newSocket.on('chat:new_message', ({ conversationId, message }) => {
      if (import.meta.env.DEV) {
        console.log('[NOTIF_DEBUG:1_SOCKET_EVENT]', JSON.stringify({
          event: 'chat:new_message',
          conversationId: conversationId?.toString(),
          hasMessage: Boolean(message),
        }));
      }
      if (!conversationId || !message) return;
      const currentUid = (user?.id || user?._id || '').toString();
      const senderId = (message.sender?._id || message.sender)?.toString();

      if (import.meta.env.DEV) {
        console.log('[NOTIF_DEBUG:2_IDENTIFY]', JSON.stringify({
          messageId: message._id?.toString(),
          recipientId: currentUid,
          senderId,
          isOwnMessage: senderId === currentUid,
        }));
      }

      // Don't alert own sent messages
      if (senderId && senderId === currentUid) return;

      alertIncomingChatMessage({
        conversationId,
        messageId: message._id,
        senderName: message.sender?.name,
        content: message.content,
        attachments: message.attachments,
        sender: message.sender,
        createdAt: message.createdAt,
      });
    });

    // Handle read receipt updates
    newSocket.on('chat:read_update', () => {
      refreshChatUnread();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token, user, refreshNotifications, refreshChatUnread, addToast, alertIncomingChatMessage]);

  // Chat Socket Helpers
  const joinConversation = useCallback((conversationId, callback) => {
    if (!conversationId) return;
    const cid = conversationId.toString();
    activeChatConvRef.current = cid;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('conversation:join', { conversationId: cid }, (res) => {
        if (typeof callback === 'function') callback(res);
      });
    }
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    if (!conversationId) return;
    const cid = conversationId.toString();
    if (activeChatConvRef.current === cid) {
      activeChatConvRef.current = null;
    }
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('conversation:leave', { conversationId: cid });
    }
  }, []);

  const sendTyping = useCallback((conversationId, isTyping) => {
    if (socketRef.current && socketRef.current.connected && conversationId) {
      socketRef.current.emit('chat:typing', { conversationId, isTyping });
    }
  }, []);

  const isUserOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      return onlineUsers.has(userId.toString());
    },
    [onlineUsers]
  );

  // Optimistic & reactive notification read handler
  const markAsRead = useCallback(async (id) => {
    if (!id) return;
    const idStr = id.toString();

    // 1. Immediately & synchronously update state so UI changes instantly
    setNotifications((prev) => {
      const target = prev.find((n) => (n._id || n.id)?.toString() === idStr);
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      const isMsg = target && (target.type === 'new_message' || target.link?.includes('chat'));
      if (isMsg) {
        return prev.filter((n) => (n._id || n.id)?.toString() !== idStr);
      }
      return prev.map((n) =>
        (n._id || n.id)?.toString() === idStr ? { ...n, isRead: true, readAt: new Date() } : n
      );
    });

    // 2. Persist to server if it's a real MongoDB ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
      try {
        const res = await notificationService.markAsRead(idStr);
        if (typeof res?.data?.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      } catch (err) {
        console.warn('Error marking notification read on server:', err?.message);
      }
    }
  }, []);

  // Mark all notifications for a specific conversation as read (instant + server sync)
  const markConversationNotificationsRead = useCallback(async (convId) => {
    if (!convId) return;
    const cidStr = convId.toString();

    // 1. Immediately & synchronously update state: checked messages disappear from notification center
    setNotifications((prev) => {
      let unreadInGroup = 0;
      const filtered = prev.filter((n) => {
        const matches =
          n.metadata?.conversationId?.toString() === cidStr ||
          n.link?.includes(cidStr);
        if (matches && !n.isRead) {
          unreadInGroup++;
        }
        return !matches;
      });

      if (unreadInGroup > 0) {
        setUnreadCount((c) => Math.max(0, c - unreadInGroup));
      }
      return filtered;
    });

    // 2. Refresh unread count in chat
    refreshChatUnread();

    // 3. Persist to server
    try {
      const res = await notificationService.markConversationAsRead(cidStr);
      if (typeof res?.data?.unreadCount === 'number') {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.warn('Failed to mark conversation notifications as read:', err?.message);
    }
  }, [refreshChatUnread]);

  const markAllAsRead = useCallback(async () => {
    // 1. Immediately & synchronously update UI state:
    // Message notifications disappear; workflow notifications become marked read
    setNotifications((prev) =>
      prev
        .filter((n) => n.type !== 'new_message' && !n.link?.includes('chat'))
        .map((n) => ({ ...n, isRead: true, readAt: new Date() }))
    );
    setUnreadCount(0);

    // 2. Persist to server
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
    refreshChatUnread();
  }, [refreshChatUnread]);

  const deleteNotification = useCallback(async (id) => {
    if (!id) return;
    const idStr = id.toString();

    // 1. Optimistic delete
    setNotifications((prev) => {
      const target = prev.find((n) => (n._id || n.id)?.toString() === idStr);
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => (n._id || n.id)?.toString() !== idStr);
    });

    // 2. Server delete
    if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
      try {
        const res = await notificationService.deleteNotification(idStr);
        if (typeof res?.data?.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      } catch (err) {
        console.error('Error deleting notification:', err);
      }
    }
  }, []);

  const clearAllNotifications = useCallback(async (onlyRead = false) => {
    try {
      if (onlyRead) {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
      await notificationService.clearAllNotifications({ onlyRead: onlyRead ? 'true' : 'false' });
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        unreadCount,
        isLoading,
        onlineUsers,
        totalChatUnread,
        pushPermission,
        toasts,
        soundEnabled,
        toggleSound,
        dismissToast,
        addToast,
        activeChatConversationId,
        setActiveChatConversationId,
        requestPushPermission,
        setTotalChatUnread,
        refreshChatUnread,
        isUserOnline,
        joinConversation,
        leaveConversation,
        sendTyping,
        refreshNotifications,
        markAsRead,
        markConversationNotificationsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
