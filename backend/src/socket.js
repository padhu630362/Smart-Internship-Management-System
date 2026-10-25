import { Server } from 'socket.io';
import { verifyToken } from './utils/jwt.js';
import { User, USER_STATUSES } from './models/User.js';
import { Conversation } from './models/Conversation.js';
import { logger } from './utils/logger.js';
import { env } from './config/env.js';

let io = null;
const onlineUsers = new Map(); // userId -> Set of socketIds

/**
 * Initialize Socket.IO instance attached to HTTP server with JWT authentication
 */
export const initSocket = (server) => {
  const envAllowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const socketAllowedOrigins = [
    env.CLIENT_URL,
    ...envAllowed,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || socketAllowedOrigins.includes(origin) || env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
          return callback(null, true);
        }
        return callback(new Error('CORS request blocked by Socket.IO policy.'));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Socket.IO Handshake Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!rawToken) {
        return next(new Error('Authentication token missing from socket handshake.'));
      }

      const decoded = verifyToken(rawToken);
      if (!decoded || !decoded.id) {
        return next(new Error('Invalid or malformed authentication token.'));
      }

      const user = await User.findById(decoded.id).select('name email role status');
      if (!user) {
        return next(new Error('Authenticated user account no longer exists.'));
      }

      if (user.status !== USER_STATUSES.ACTIVE) {
        return next(new Error('User account is currently suspended or deactivated.'));
      }

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (err) {
      logger.warn(`Socket authentication rejected: ${err.message}`);
      next(new Error(`Authentication unauthorized: ${err.message}`));
    }
  });

  // Client connection handler
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const userRoom = `user:${userId}`;

    // Join isolated individual user room
    socket.join(userRoom);

    // Track online state
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      // Broadcast online status to connected clients
      io.emit('user:status', { userId, status: 'online' });
    }
    onlineUsers.get(userId).add(socket.id);

    logger.info(`Socket client connected: ${socket.id} (User: ${socket.user.name}, Room: ${userRoom})`);

    // Handle ping/keepalive check
    socket.on('ping:keepalive', (callback) => {
      if (typeof callback === 'function') {
        callback({ status: 'ok', timestamp: Date.now() });
      }
    });

    // Provide currently online users
    socket.on('users:get_online', (callback) => {
      if (typeof callback === 'function') {
        callback({
          status: 'ok',
          onlineUserIds: Array.from(onlineUsers.keys()),
        });
      }
    });

    // Join authorized conversation room
    socket.on('conversation:join', async ({ conversationId }, callback) => {
      try {
        if (!conversationId) {
          if (typeof callback === 'function') {
            return callback({ success: false, error: 'Conversation ID required.' });
          }
          return;
        }

        const isMember = await Conversation.exists({
          _id: conversationId,
          participants: userId,
        });

        if (!isMember) {
          logger.warn(`User ${socket.user.name} unauthorized to join conversation ${conversationId}`);
          if (typeof callback === 'function') {
            return callback({ success: false, error: 'Unauthorized to join conversation.' });
          }
          return;
        }

        const roomName = `conversation:${conversationId}`;
        socket.join(roomName);

        if (typeof callback === 'function') {
          callback({ success: true, conversationId });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Leave conversation room
    socket.on('conversation:leave', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // Handle typing indicators
    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('chat:typing', {
          conversationId,
          userId,
          userName: socket.user.name,
          isTyping: !!isTyping,
        });
      }
    });

    // Disconnect handler
    socket.on('disconnect', async (reason) => {
      logger.info(`Socket client disconnected: ${socket.id} (${reason})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const lastSeen = new Date();
          // Update lastSeen in database
          User.findByIdAndUpdate(userId, { lastSeen }).catch((err) => {
            logger.warn(`Failed to update lastSeen for ${userId}: ${err.message}`);
          });
          // Broadcast offline status with lastSeen timestamp
          io.emit('user:status', { userId, status: 'offline', lastSeen });
        }
      }
    });
  });

  return io;
};

/**
 * Retrieve the active Socket.IO instance
 */
export const getIO = () => io;

/**
 * Get all currently online user IDs
 */
export const getOnlineUserIds = () => Array.from(onlineUsers.keys());

/**
 * Dispatch real-time notification to a specific user's private room
 */
export const emitNotificationToUser = (userId, notification) => {
  if (io && userId) {
    const targetRoom = `user:${userId.toString()}`;
    io.to(targetRoom).emit('notification:new', notification);
  }
};

/**
 * Dispatch real-time read sync to all active sessions / tabs of a user
 */
export const emitNotificationReadToUser = (userId, payload) => {
  if (io && userId) {
    const targetRoom = `user:${userId.toString()}`;
    io.to(targetRoom).emit('notification:read', payload);
  }
};

/**
 * Dispatch real-time chat message to conversation room and participants
 */
export const emitChatMessage = (conversationId, message, participantIds = []) => {
  if (io && conversationId) {
    // 1. Emit to active conversation room
    io.to(`conversation:${conversationId.toString()}`).emit('chat:message', {
      conversationId: conversationId.toString(),
      message,
    });

    // 2. Also emit new_message alert to each participant's private user room
    // for updating unread badges & conversation list previews in real time
    for (const participantId of participantIds) {
      const pid = (participantId._id || participantId).toString();
      io.to(`user:${pid}`).emit('chat:new_message', {
        conversationId: conversationId.toString(),
        message,
      });
    }
  }
};

/**
 * Dispatch real-time message edited event to conversation room and participants
 */
export const emitMessageEdited = (conversationId, message, participantIds = []) => {
  if (io && conversationId) {
    io.to(`conversation:${conversationId.toString()}`).emit('chat:message_edited', {
      conversationId: conversationId.toString(),
      message,
    });

    for (const participantId of participantIds) {
      const pid = (participantId._id || participantId).toString();
      io.to(`user:${pid}`).emit('chat:message_edited', {
        conversationId: conversationId.toString(),
        message,
      });
    }
  }
};

/**
 * Dispatch real-time message deleted event to conversation room or specific user room
 */
export const emitMessageDeleted = (conversationId, payload, participantIds = []) => {
  if (io && conversationId) {
    const { isDeletedForEveryone, deletedForUserId } = payload;
    if (isDeletedForEveryone) {
      // Broadcast to entire room and all participant user rooms
      io.to(`conversation:${conversationId.toString()}`).emit('chat:message_deleted', payload);
      for (const participantId of participantIds) {
        const pid = (participantId._id || participantId).toString();
        io.to(`user:${pid}`).emit('chat:message_deleted', payload);
      }
    } else if (deletedForUserId) {
      // Only emit to the user who requested "Delete for me"
      io.to(`user:${deletedForUserId.toString()}`).emit('chat:message_deleted', payload);
    }
  }
};

/**
 * Dispatch conversation updated event (name change, member added/removed)
 */
export const emitConversationUpdated = (conversationId, conversation, participantIds = []) => {
  if (io && conversationId) {
    io.to(`conversation:${conversationId.toString()}`).emit('conversation:updated', {
      conversationId: conversationId.toString(),
      conversation,
    });

    for (const participantId of participantIds) {
      const pid = (participantId._id || participantId).toString();
      io.to(`user:${pid}`).emit('conversation:updated', {
        conversationId: conversationId.toString(),
        conversation,
      });
    }
  }
};

/**
 * Dispatch read receipt update
 */
export const emitReadReceipt = (conversationId, userId, readAt, participantIds = [], userObj = null) => {
  if (io && conversationId) {
    const payload = {
      conversationId: conversationId.toString(),
      userId: userId.toString(),
      readAt,
      user: userObj || null,
    };
    io.to(`conversation:${conversationId.toString()}`).emit('chat:read_update', payload);

    for (const participantId of participantIds) {
      const pid = (participantId._id || participantId).toString();
      io.to(`user:${pid}`).emit('chat:read_update', payload);
    }
  }
};

/**
 * Dispatch real-time message reaction update to conversation room and participants
 */
export const emitMessageReaction = (conversationId, payload, participantIds = []) => {
  if (io && conversationId) {
    io.to(`conversation:${conversationId.toString()}`).emit('chat:message_reaction', payload);

    for (const participantId of participantIds) {
      const pid = (participantId._id || participantId).toString();
      io.to(`user:${pid}`).emit('chat:message_reaction', payload);
    }
  }
};

/**
 * Dispatch real-time message pinned update to conversation room and participants
 */
export const emitMessagePinned = (conversationId, payload, participantIds = []) => {
  if (io && conversationId) {
    const room = `conversation:${conversationId.toString()}`;
    io.to(room).emit('chat:message_pinned', payload);
    io.to(room).emit('message_pinned', payload);

    for (const participantId of participantIds) {
      const pid = (participantId._id || participantId).toString();
      io.to(`user:${pid}`).emit('chat:message_pinned', payload);
      io.to(`user:${pid}`).emit('message_pinned', payload);
    }
  }
};

/**
 * Dispatch real-time message unpinned update to conversation room and participants
 */
export const emitMessageUnpinned = (conversationId, payload, participantIds = []) => {
  if (io && conversationId) {
    const room = `conversation:${conversationId.toString()}`;
    io.to(room).emit('chat:message_unpinned', payload);
    io.to(room).emit('message_unpinned', payload);

    for (const participantId of participantIds) {
      const pid = (participantId._id || participantId).toString();
      io.to(`user:${pid}`).emit('chat:message_unpinned', payload);
      io.to(`user:${pid}`).emit('message_unpinned', payload);
    }
  }
};

/**
 * Broadcast notification or generic event to all connected users
 */
export const broadcastNotification = (event, payload) => {
  if (io) {
    io.emit(event, payload);
  }
};

