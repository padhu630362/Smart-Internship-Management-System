import webpush from 'web-push';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

let isVapidConfigured = false;

// Configure Web Push VAPID keys
try {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT || 'mailto:support@internhub.edu',
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );
    isVapidConfigured = true;
    logger.info('Web Push VAPID configuration initialized successfully.');
  }
} catch (err) {
  logger.warn(`Web Push VAPID initialization note: ${err.message}`);
}

/**
 * Register or update a browser push subscription for a user
 */
export const addPushSubscription = async (userId, subscription) => {
  if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return null;
  }

  try {
    const user = await User.findById(userId);
    if (!user) return null;

    if (!user.pushSubscriptions) {
      user.pushSubscriptions = [];
    }

    // Check if subscription endpoint already exists
    const existingIndex = user.pushSubscriptions.findIndex(
      (s) => s.endpoint === subscription.endpoint
    );

    if (existingIndex >= 0) {
      user.pushSubscriptions[existingIndex] = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime || null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        createdAt: new Date(),
      };
    } else {
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime || null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        createdAt: new Date(),
      });
    }

    await user.save();
    return true;
  } catch (err) {
    logger.error('Failed to add push subscription:', err);
    return false;
  }
};

/**
 * Remove a push subscription by endpoint
 */
export const removePushSubscription = async (userId, endpoint) => {
  if (!userId || !endpoint) return false;
  try {
    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint } },
    });
    return true;
  } catch (err) {
    logger.error('Failed to remove push subscription:', err);
    return false;
  }
};

/**
 * Dispatch Web Push notification to all registered browser devices for a user
 */
export const sendPushNotification = async (userId, payload) => {
  if (!isVapidConfigured || !userId) return;

  try {
    const user = await User.findById(userId).select('pushSubscriptions');
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return;
    }

    const jsonPayload = JSON.stringify({
      title: payload.title || 'InternHub Notification',
      message: payload.message || payload.body || 'You have an update in InternHub.',
      link: payload.link || payload.url || '/',
      icon: payload.icon || '/internhub-icon.png',
      badge: payload.badge || '/internhub-badge.png',
      tag: payload.tag || `notif_${Date.now()}`,
      metadata: payload.metadata || {},
      requireInteraction: Boolean(payload.requireInteraction),
    });

    const deadEndpoints = [];

    await Promise.allSettled(
      user.pushSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            jsonPayload
          );
        } catch (pushErr) {
          // If 404 or 410, browser unsubscribed or expired
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            deadEndpoints.push(sub.endpoint);
          } else {
            logger.debug(`Web push delivery error: ${pushErr.message}`);
          }
        }
      })
    );

    // Clean up stale / expired subscriptions
    if (deadEndpoints.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushSubscriptions: { endpoint: { $in: deadEndpoints } } },
      });
      logger.info(`Pruned ${deadEndpoints.length} stale push subscription(s) for user ${userId}.`);
    }
  } catch (err) {
    logger.debug(`sendPushNotification caught note: ${err.message}`);
  }
};

export default {
  addPushSubscription,
  removePushSubscription,
  sendPushNotification,
};

