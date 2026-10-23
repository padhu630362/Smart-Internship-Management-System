import { Notification, NOTIFICATION_TYPES } from '../models/Notification.js';
import { emitNotificationToUser, broadcastNotification } from '../socket.js';
import { sendPushNotification } from './pushNotificationService.js';
import { logger } from '../utils/logger.js';

/**
 * Persist and dispatch real-time notification to a single user.
 * Supports idempotency via eventKey to prevent duplicate notifications.
 */
export const createAndDispatchNotification = async ({
  recipientId,
  senderId = null,
  type,
  title,
  message,
  link = null,
  metadata = {},
  eventKey = null,
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

    const sanitizedEventKey = eventKey ? String(eventKey).trim() : null;

    // Idempotency check: if an identical event was already processed for this recipient, return it
    if (sanitizedEventKey) {
      const existing = await Notification.findOne({
        recipient: recipientId,
        eventKey: sanitizedEventKey,
      })
        .populate('sender', 'name email role')
        .lean();

      if (existing) {
        logger.info(`Notification with eventKey "${sanitizedEventKey}" already exists for user ${recipientId}. Skipping duplicate.`);
        return existing;
      }
    }

    const docData = {
      recipient: recipientId,
      sender: senderId || null,
      type,
      title: title.trim(),
      message: message.trim(),
      link: link || null,
      metadata: metadata || {},
    };

    if (sanitizedEventKey) {
      docData.eventKey = sanitizedEventKey;
    }

    let notification;
    try {
      notification = await Notification.create(docData);
    } catch (createErr) {
      // Handle race condition on unique compound index { recipient: 1, eventKey: 1 }
      if (createErr.code === 11000 && sanitizedEventKey) {
        logger.info(`Concurrent duplicate notification prevented by unique index: ${sanitizedEventKey}`);
        return await Notification.findOne({
          recipient: recipientId,
          eventKey: sanitizedEventKey,
        })
          .populate('sender', 'name email role profile.avatarUrl')
          .lean();
      }
      throw createErr;
    }

    const populated = await Notification.findById(notification._id)
      .populate('sender', 'name email role profile.avatarUrl')
      .lean();

    // Deliver via Socket.IO to private user room
    emitNotificationToUser(recipientId, populated);

    // Also dispatch Web Push notification (for background / closed browser alerts)
    const pushTag = populated.type === NOTIFICATION_TYPES.NEW_MESSAGE && populated.metadata?.conversationId
      ? `chat_${populated.metadata.conversationId}_${populated.metadata?.messageId || populated._id}`
      : (populated.metadata?.isTest ? `test_notification_${populated._id}` : `notif_${populated._id}`);

    sendPushNotification(recipientId, {
      title: populated.title,
      message: populated.message,
      link: populated.link,
      tag: pushTag,
      metadata: populated.metadata,
    }).catch(() => {});

    return populated;
  } catch (error) {
    logger.error('Failed to create and dispatch notification:', error);
    // Never fail parent transaction/request if notification delivery fails
    return null;
  }
};

/**
 * Persist and dispatch notifications to multiple recipients (e.g., announcements, job broadcasts).
 * Supports idempotency via eventKeyPrefix to prevent duplicate notifications.
 */
export const createAndDispatchBulkNotifications = async (
  recipientIds = [],
  { senderId = null, type, title, message, link = null, metadata = {}, eventKeyPrefix = null }
) => {
  try {
    const validRecipients = [...new Set(recipientIds.map((id) => id?.toString()))].filter(
      (id) => id && (!senderId || id !== senderId.toString())
    );

    if (validRecipients.length === 0) {
      return [];
    }

    let targetRecipients = validRecipients;

    // Deduplicate against existing notifications if an eventKeyPrefix is provided
    if (eventKeyPrefix) {
      const sanitizedPrefix = String(eventKeyPrefix).trim();
      const existingKeys = targetRecipients.map((recId) => `${sanitizedPrefix}:${recId}`);
      
      const alreadyNotified = await Notification.find({
        recipient: { $in: targetRecipients },
        eventKey: { $in: existingKeys },
      }).select('recipient').lean();

      const notifiedSet = new Set(alreadyNotified.map((n) => n.recipient.toString()));
      targetRecipients = targetRecipients.filter((recId) => !notifiedSet.has(recId));

      if (targetRecipients.length === 0) {
        logger.info(`Bulk notification for prefix "${sanitizedPrefix}" already delivered to all intended recipients.`);
        return [];
      }
    }

    const docsToInsert = targetRecipients.map((recId) => {
      const doc = {
        recipient: recId,
        sender: senderId || null,
        type,
        title: title.trim(),
        message: message.trim(),
        link: link || null,
        metadata: metadata || {},
      };
      if (eventKeyPrefix) {
        doc.eventKey = `${String(eventKeyPrefix).trim()}:${recId}`;
      }
      return doc;
    });

    let insertedDocs = [];
    try {
      insertedDocs = await Notification.insertMany(docsToInsert, { ordered: false });
    } catch (insertErr) {
      // In case of partial duplicates with ordered: false, retrieve inserted ones
      if (insertErr.insertedDocs && insertErr.insertedDocs.length > 0) {
        insertedDocs = insertErr.insertedDocs;
      } else {
        logger.warn('Bulk notification insert encountered duplicate keys:', insertErr.message);
      }
    }

    // Emit real-time event & Web Push to each recipient
    for (const doc of insertedDocs) {
      emitNotificationToUser(doc.recipient, doc);
      sendPushNotification(doc.recipient, {
        title: doc.title,
        message: doc.message,
        link: doc.link,
        tag: `notif_${doc._id}`,
        metadata: doc.metadata,
      }).catch(() => {});
    }

    return insertedDocs;
  } catch (error) {
    logger.error('Failed to dispatch bulk notifications:', error);
    return [];
  }
};

export { NOTIFICATION_TYPES, broadcastNotification };
