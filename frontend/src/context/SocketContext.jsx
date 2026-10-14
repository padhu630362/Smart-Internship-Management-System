import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';

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
  const socketRef = useRef(null);

  // Fetch unread count & initial recent notifications
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const [countRes, listRes] = await Promise.all([
        notificationService.getUnreadCount(),
        notificationService.getNotifications({ page: 1, limit: 20 }),
      ]);
      setUnreadCount(countRes?.data?.unreadCount || 0);
      setNotifications(listRes?.data?.notifications || []);
    } catch (err) {
      console.warn('Failed to fetch initial notifications:', err?.message);
    } finally {
      setIsLoading(false);
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
      return;
    }

    refreshNotifications();

    // Determine backend socket URL
    const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

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

    // Handle incoming real-time notifications with deduplication
    newSocket.on('notification:new', (notification) => {
      if (!notification || !notification._id) return;

      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === notification._id);
        if (exists) return prev;
        return [notification, ...prev];
      });

      setUnreadCount((prev) => prev + 1);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token, refreshNotifications]);

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
        setTotalChatUnread,
        isUserOnline,
        joinConversation,
        leaveConversation,
        sendTyping,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
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
