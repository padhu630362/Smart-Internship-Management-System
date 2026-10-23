import { Notification, NOTIFICATION_TYPES } from '../models/Notification.js';
import { User, ROLES } from '../models/User.js';
import { Allocation } from '../models/Allocation.js';
import {
  createAndDispatchNotification,
  createAndDispatchBulkNotifications,
} from '../services/notificationService.js';
import {
  addPushSubscription,
  removePushSubscription,
  sendPushNotification,
} from '../services/pushNotificationService.js';
import { emitNotificationReadToUser } from '../socket.js';
import { env } from '../config/env.js';

/**
 * Get current user's notifications with pagination and unread filtering
 */
export const getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const query = {
      recipient: req.user.id,
      $or: [
        { type: { $ne: NOTIFICATION_TYPES.NEW_MESSAGE } },
        { isRead: false },
      ],
    };

    if (req.query.isRead !== undefined && req.query.isRead !== 'all') {
      query.isRead = req.query.isRead === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'name email role profile.avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user.id, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fast endpoint to retrieve current user's unread notification count
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id,
    });

    if (!notification) {
      const error = new Error('Notification not found or access denied.');
      error.statusCode = 404;
      error.code = 'NOTIFICATION_NOT_FOUND';
      return next(error);
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    const isChatMsg =
      notification.type === NOTIFICATION_TYPES.NEW_MESSAGE ||
      notification.link?.includes('chat');

    // Ephemeral message notifications disappear once checked/read
    if (isChatMsg) {
      await Notification.deleteOne({ _id: notification._id });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false,
    });

    // Real-time synchronization across all tabs of the recipient
    emitNotificationReadToUser(req.user.id, {
      notificationId: notification._id.toString(),
      unreadCount,
      deleted: isChatMsg,
    });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: {
        notification,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark all notifications for a specific chat conversation as read
 */
export const markConversationNotificationsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    // Delete message notifications for this conversation since user has checked/read them
    await Notification.deleteMany({
      recipient: userId,
      $or: [
        { 'metadata.conversationId': conversationId },
        { link: { $regex: conversationId } },
      ],
    });

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    // Broadcast update to all user sockets/tabs
    emitNotificationReadToUser(userId, {
      conversationId: conversationId.toString(),
      unreadCount,
      deleted: true,
    });

    res.status(200).json({
      success: true,
      message: 'Conversation notifications cleared.',
      data: { conversationId, unreadCount },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark all notifications as read for current user
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    // Message notifications disappear when marked read
    await Notification.deleteMany({
      recipient: req.user.id,
      $or: [
        { type: NOTIFICATION_TYPES.NEW_MESSAGE },
        { link: { $regex: 'chat' } },
      ],
    });

    const result = await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Sync all tabs immediately
    emitNotificationReadToUser(req.user.id, {
      all: true,
      unreadCount: 0,
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: {
        modifiedCount: result.modifiedCount,
        unreadCount: 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id,
    });

    if (!notification) {
      const error = new Error('Notification not found or access denied.');
      error.statusCode = 404;
      error.code = 'NOTIFICATION_NOT_FOUND';
      return next(error);
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false,
    });

    emitNotificationReadToUser(req.user.id, {
      deletedId: req.params.id,
      unreadCount,
    });

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.',
      data: { id: req.params.id, unreadCount },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Clear notifications for current user (optionally only read ones)
 */
export const clearAllNotifications = async (req, res, next) => {
  try {
    const filter = { recipient: req.user.id };
    if (req.query.onlyRead === 'true') {
      filter.isRead = true;
    }

    const result = await Notification.deleteMany(filter);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false,
    });

    // Real-time synchronization across all tabs
    emitNotificationReadToUser(req.user.id, {
      all: req.query.onlyRead !== 'true',
      unreadCount,
    });

    res.status(200).json({
      success: true,
      message: 'Notifications cleared successfully.',
      data: {
        deletedCount: result.deletedCount,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mentors, Coordinators, and Admins can broadcast announcements
 */
export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, targetAudience, internshipId } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      const error = new Error('Announcement title and message are required.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      return next(error);
    }

    let recipientIds = [];

    // Target selection:
    // 1. Specific internship: notify all active allocated students in that internship
    if (internshipId) {
      const allocations = await Allocation.find({
        internship: internshipId,
        status: 'active',
      }).select('student');
      recipientIds = allocations.map((a) => a.student);
    } else if (targetAudience === 'all_students') {
      // 2. All active students
      const students = await User.find({
        role: ROLES.STUDENT,
        status: 'active',
      }).select('_id');
      recipientIds = students.map((s) => s._id);
    } else if (req.user.role === ROLES.MENTOR) {
      // 3. Mentor's assigned interns
      const allocations = await Allocation.find({
        mentor: req.user.id,
        status: 'active',
      }).select('student');
      recipientIds = allocations.map((a) => a.student);
    } else {
      // Default fallback: active students
      const students = await User.find({
        role: ROLES.STUDENT,
        status: 'active',
      }).select('_id');
      recipientIds = students.map((s) => s._id);
    }

    const dispatched = await createAndDispatchBulkNotifications(recipientIds, {
      senderId: req.user.id,
      type: NOTIFICATION_TYPES.MENTOR_ANNOUNCEMENT,
      title: title.trim(),
      message: message.trim(),
      link: '/dashboard',
      metadata: {
        senderRole: req.user.role,
        internshipId: internshipId || null,
      },
    });

    res.status(201).json({
      success: true,
      message: `Announcement broadcast to ${recipientIds.length} user(s).`,
      data: {
        recipientCount: recipientIds.length,
        dispatchedCount: dispatched.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve VAPID public key for Web Push subscription
 */
export const getVapidPublicKey = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      publicKey: env.VAPID_PUBLIC_KEY || '',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Register or update browser Web Push subscription for authenticated user
 */
export const subscribePush = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription object: endpoint is required.',
      });
    }

    await addPushSubscription(req.user.id, subscription);

    res.status(200).json({
      success: true,
      message: 'Push subscription registered successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Remove a browser Web Push subscription
 */
export const unsubscribePush = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required to unsubscribe.',
      });
    }

    await removePushSubscription(req.user.id, endpoint);

    res.status(200).json({
      success: true,
      message: 'Push subscription removed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Dispatch an on-demand test desktop notification to authenticated user
 */
export const sendTestNotification = async (req, res, next) => {
  try {
    const testNotification = await createAndDispatchNotification({
      recipientId: req.user.id,
      senderId: req.user.id, // bypass self check by passing null in helper if needed
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      title: 'InternHub Desktop Notification Test',
      message: 'Real-time desktop system alerts are active and working on your device!',
      link: '/notifications',
      metadata: { isTest: true },
    });

    // If self-check returned null, manually dispatch for test purposes
    if (!testNotification) {
      const manualDoc = {
        _id: `test_${Date.now()}`,
        recipient: req.user.id,
        type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
        title: 'InternHub Desktop Notification Test',
        message: 'Real-time desktop system alerts are active and working on your device!',
        link: '/notifications',
        isRead: false,
        createdAt: new Date(),
        metadata: { isTest: true },
      };

      // Emit via socket
      const { emitNotificationToUser } = await import('../socket.js');
      emitNotificationToUser(req.user.id, manualDoc);

      // Emit via push
      await sendPushNotification(req.user.id, {
        title: manualDoc.title,
        message: manualDoc.message,
        link: manualDoc.link,
        tag: `test_notification_${Date.now()}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Test desktop notification dispatched via Socket.IO and Web Push.',
    });
  } catch (err) {
    next(err);
  }
};
