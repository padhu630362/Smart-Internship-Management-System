import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';
import chatService from '../services/chatService';
import soundManager from '../utils/audio';

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

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toastData) => {
    setToasts((prev) => {
      if (prev.some((t) => t.id === toastData.id)) return prev;
      return [toastData, ...prev.slice(0, 3)];
    });
  }, []);

  // Request browser desktop push permission
  const requestPushPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      return permission;
    } catch (err) {
      console.warn('Failed to request push notification permission:', err);
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

      // Query currently online users list on connection
      newSocket.emit('users:get_online', (res) => {
        if (res?.onlineUserIds && Array.isArray(res.onlineUserIds)) {
          setOnlineUsers(new Set(res.onlineUserIds));
        }
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
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
      if (!notification || !notification._id) return;

      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === notification._id);
        if (exists) return prev;
        return [notification, ...prev];
      });

      setUnreadCount((prev) => prev + 1);

      const isMsg = notification.type === 'new_message';
      const convId = notification.metadata?.conversationId?.toString();
      const isCurrentActiveChat = isMsg && convId && activeChatConvRef.current === convId;

      if (isCurrentActiveChat) {
        // Recipient is actively inside this open conversation in ChatPage; auto-mark read and suppress popup
        notificationService.markAsRead(notification._id).catch(() => {});
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return;
      }

      // Play pleasant audio chime
      soundManager.playNotificationChime();

      // Record message ID for deduplication against chat:new_message
      if (notification.metadata?.messageId) {
        recentToastedMessagesRef.current.add(notification.metadata.messageId.toString());
        // Clean up set after 10 seconds
        setTimeout(() => {
          recentToastedMessagesRef.current.delete(notification.metadata.messageId.toString());
        }, 10000);
      }

      // Show real-time interactive in-app popup toast
      addToast({
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        sender: notification.sender,
        metadata: notification.metadata,
        createdAt: notification.createdAt || new Date(),
      });

      // Trigger native browser notification if granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const title = notification.title || 'InternHub Notification';
          const options = {
            body: notification.message || 'A new update is available in your portal.',
            icon: '/favicon.ico',
            tag: notification._id,
          };
          new Notification(title, options);
        } catch (e) {
          console.debug('Browser notification error:', e);
        }
      }
    });

    // Handle real-time direct & group chat incoming message alerts across the app
    newSocket.on('chat:new_message', ({ conversationId, message }) => {
      if (!conversationId || !message) return;
      const currentUid = (user?.id || user?._id || '').toString();
      const senderId = (message.sender?._id || message.sender)?.toString();

      // Don't toast own sent messages
      if (senderId && senderId === currentUid) return;

      const isCurrentActiveChat = activeChatConvRef.current === conversationId.toString();

      if (!isCurrentActiveChat) {
        setTotalChatUnread((prev) => prev + 1);

        const msgId = (message._id || '').toString();
        if (msgId && !recentToastedMessagesRef.current.has(msgId)) {
          recentToastedMessagesRef.current.add(msgId);
          setTimeout(() => {
            recentToastedMessagesRef.current.delete(msgId);
          }, 10000);

          soundManager.playNotificationChime();

          addToast({
            id: `chat-${msgId || Date.now()}`,
            type: 'new_message',
            title: `New message from ${message.sender?.name || 'Someone'}`,
            message: message.content || 'Sent a new message',
            link: `/chat?conversationId=${conversationId}`,
            sender: message.sender,
            metadata: { conversationId, messageId: message._id },
            createdAt: message.createdAt || new Date(),
          });
        }
      }
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
  }, [isAuthenticated, token, user, refreshNotifications, refreshChatUnread, addToast]);

  // Chat Socket Helpers
  const joinConversation = useCallback((conversationId, callback) => {
    if (socketRef.current && socketRef.current.connected && conversationId) {
      socketRef.current.emit('conversation:join', { conversationId }, (res) => {
        if (typeof callback === 'function') callback(res);
      });
    }
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    if (socketRef.current && socketRef.current.connected && conversationId) {
      socketRef.current.emit('conversation:leave', { conversationId });
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

  const markAsRead = async (id) => {
    try {
      const res = await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date() } : n))
      );
      if (typeof res?.data?.unreadCount === 'number') {
        setUnreadCount(res.data.unreadCount);
      } else {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const res = await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (typeof res?.data?.unreadCount === 'number') {
        setUnreadCount(res.data.unreadCount);
      } else {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const clearAllNotifications = async (onlyRead = false) => {
    try {
      await notificationService.clearAllNotifications({ onlyRead: onlyRead ? 'true' : 'false' });
      if (onlyRead) {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

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
