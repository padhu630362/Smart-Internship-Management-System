import { Notification, NOTIFICATION_TYPES } from '../models/Notification.js';
import { emitNotificationToUser, broadcastNotification } from '../socket.js';
import { logger } from '../utils/logger.js';

/**
 * Persist and dispatch real-time notification to a single user.
 */
export const createAndDispatchNotification = async ({
  recipientId,
  senderId = null,
  type,
  title,
  message,
  link = null,
  metadata = {},
}) => {
  try {
    if (!recipientId) {
      logger.warn('Notification dispatch skipped: recipientId is missing.');
      return null;
    }

    // Do not notify a user if they performed the action themselves
    if (senderId && senderId.toString() === recipientId.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId || null,
      type,
      title: title.trim(),
      message: message.trim(),
      link: link || null,
      metadata: metadata || {},
    });

    const populated = await Notification.findById(notification._id)
      .populate('sender', 'name email role')
      .lean();

    // Deliver via Socket.IO to private user room
    emitNotificationToUser(recipientId, populated);

    return populated;
  } catch (error) {
    logger.error('Failed to create and dispatch notification:', error);
    // Never fail parent transaction/request if notification delivery fails
    return null;
  }
};

/**
 * Persist and dispatch notifications to multiple recipients (e.g., announcements).
 */
export const createAndDispatchBulkNotifications = async (
  recipientIds = [],
  { senderId = null, type, title, message, link = null, metadata = {} }
) => {
  try {
    const validRecipients = [...new Set(recipientIds.map((id) => id?.toString()))].filter(
      (id) => id && (!senderId || id !== senderId.toString())
    );

    if (validRecipients.length === 0) {
      return [];
    }

    const docsToInsert = validRecipients.map((recId) => ({
      recipient: recId,
      sender: senderId || null,
      type,
      title: title.trim(),
      message: message.trim(),
      link: link || null,
      metadata: metadata || {},
    }));

    const insertedDocs = await Notification.insertMany(docsToInsert);

    // Emit real-time event to each recipient's private room
    for (const doc of insertedDocs) {
      emitNotificationToUser(doc.recipient, doc);
    }

    return insertedDocs;
  } catch (error) {
    logger.error('Failed to dispatch bulk notifications:', error);
    return [];
  }
};

export { NOTIFICATION_TYPES, broadcastNotification };
