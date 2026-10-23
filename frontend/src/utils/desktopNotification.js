import apiClient from '../api/client';

// Deduplication registry to prevent duplicate native popups within a 15-second sliding window
const recentNotificationTags = new Map(); // tag -> timestamp

/**
 * Convert base64 VAPID public key to Uint8Array for PushManager subscription
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check whether the current browser supports the Notifications API
 */
export const isDesktopNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Check whether Service Worker is supported
 */
export const isServiceWorkerSupported = () => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
};

/**
 * Check whether PushManager is supported
 */
export const isPushManagerSupported = () => {
  return typeof window !== 'undefined' && 'PushManager' in window;
};

/**
 * Get current browser notification permission status
 */
export const getDesktopNotificationPermission = () => {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Register Service Worker safely
 */
export const registerServiceWorker = async () => {
  if (!isServiceWorkerSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    console.debug('Service Worker registration note:', err?.message);
    return null;
  }
};

/**
 * Subscribe to Web Push with VAPID key and sync subscription with backend
 */
export const syncPushSubscription = async (registration) => {
  if (!registration || !isPushManagerSupported()) return null;
  try {
    // 1. Fetch VAPID public key from backend
    const res = await apiClient.get('/notifications/push/vapid-key');
    const vapidPublicKey = res?.data?.publicKey;
    if (!vapidPublicKey) return null;

    // 2. Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // 3. Register subscription with backend
    if (subscription) {
      await apiClient.post('/notifications/push/subscribe', {
        subscription: subscription.toJSON(),
      });
    }

    return subscription;
  } catch (err) {
    console.debug('Push subscription sync note:', err?.message);
    return null;
  }
};

/**
 * Request notification permission from the user following an explicit user action
 */
export const requestDesktopNotificationPermission = async () => {
  if (!isDesktopNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const reg = await registerServiceWorker();
      if (reg) {
        syncPushSubscription(reg).catch(() => {});
      }
    }

    return permission;
  } catch (err) {
    console.warn('Failed to request desktop notification permission:', err);
    return 'denied';
  }
};

/**
 * Show a genuine native browser/OS desktop system notification
 */
export const showDesktopNotification = async ({
  title,
  body,
  icon = '/internhub-icon.png',
  badge = '/internhub-badge.png',
  tag,
  link = '/',
  metadata = {},
  requireInteraction = false,
  silent = false,
}) => {
  const isSupported = isDesktopNotificationSupported();
  const currentPermission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

  if (import.meta.env.DEV) {
    console.log('[NOTIF_DEBUG:4_PERMISSION]', JSON.stringify({
      isSupported,
      permission: currentPermission,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    }));
  }

  if (!isSupported) {
    if (import.meta.env.DEV) {
      console.warn('[NOTIF_DEBUG:4_PERMISSION] Desktop Notifications API is not supported in this browser.');
    }
    return null;
  }

  if (currentPermission !== 'granted') {
    if (import.meta.env.DEV) {
      console.warn(`[NOTIF_DEBUG:4_PERMISSION] Desktop notification skipped: current permission is '${currentPermission}'.`);
    }
    return null;
  }

  // Ensure absolute URLs for icons on Windows desktop (Windows Action Center requires absolute HTTP/HTTPS URIs)
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
  const toAbsoluteUrl = (path, fallback) => {
    const target = path || fallback;
    if (!target) return undefined;
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('data:')) {
      return target;
    }
    if (origin) {
      try {
        return new URL(target, origin).href;
      } catch {
        return target;
      }
    }
    return target;
  };

  const resolvedIcon = toAbsoluteUrl(icon, '/internhub-icon.png');
  const resolvedBadge = toAbsoluteUrl(badge, '/internhub-badge.png');

  // Deep-clone and sanitize metadata to avoid DOMException DataCloneError
  let safeMetadata = {};
  try {
    safeMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : {};
  } catch {
    safeMetadata = {};
  }

  // Deduplication guard: deduplicate identical message or event within 12 seconds
  const resolvedTag = tag ? String(tag).trim() : null;
  const dedupKey = safeMetadata?.messageId
    ? `msg_${safeMetadata.messageId}`
    : (resolvedTag || title);

  const now = Date.now();
  if (dedupKey) {
    const lastSeen = recentNotificationTags.get(dedupKey);
    if (lastSeen && now - lastSeen < 12000) {
      return null;
    }
    recentNotificationTags.set(dedupKey, now);
    // Cleanup old keys after 20 seconds
    setTimeout(() => {
      recentNotificationTags.delete(dedupKey);
    }, 20000);
  }

  const notificationOptions = {
    body: body || 'You have a new update in your InternHub portal.',
    icon: resolvedIcon,
    badge: resolvedBadge,
    tag: resolvedTag || undefined,
    renotify: Boolean(resolvedTag),
    data: {
      url: link || '/',
      metadata: safeMetadata,
      timestamp: now,
    },
    requireInteraction: Boolean(requireInteraction),
    silent: Boolean(silent),
  };

  // Inspect Service Worker registration & state
  let swReg = null;
  if (isServiceWorkerSupported()) {
    try {
      swReg = await navigator.serviceWorker.getRegistration();
    } catch (e) {}
  }
  if (import.meta.env.DEV) {
    console.log('[NOTIF_DEBUG:5_SW_STATE]', JSON.stringify({
      isServiceWorkerSupported: isServiceWorkerSupported(),
      hasRegistration: Boolean(swReg),
      scope: swReg?.scope,
      active: Boolean(swReg?.active),
      controller: typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker?.controller),
    }));
  }

  // 1. Direct native window Notification (primary on desktop Chrome, Edge, Firefox, Safari on Windows)
  // Provides direct instant OS popups with tab focus & navigation onclick handlers
  if (typeof Notification === 'function') {
    if (import.meta.env.DEV) {
      console.log('[NOTIF_DEBUG:6_API_SELECTION]', JSON.stringify({
        selectedApi: 'window.Notification',
        title,
        tag: resolvedTag,
      }));
    }
    try {
      const notif = new Notification(title || 'InternHub Notification', notificationOptions);
      if (import.meta.env.DEV) {
        console.log('[NOTIF_DEBUG:7_EXECUTION_RESULT]', JSON.stringify({
          api: 'window.Notification',
          status: 'SUCCESS',
          notificationTitle: notif.title,
          tag: notif.tag,
        }));
      }
      notif.onclick = (e) => {
        e.preventDefault();
        try {
          window.focus();
        } catch {}
        if (link) {
          try {
            const currentPathWithSearch = window.location.pathname + window.location.search;
            if (currentPathWithSearch !== link) {
              window.location.href = link;
            }
          } catch {}
        }
        try {
          notif.close();
        } catch {}
      };
      return notif;
    } catch (winErr) {
      if (import.meta.env.DEV) {
        console.warn('[NOTIF_DEBUG:7_EXECUTION_RESULT]', JSON.stringify({
          api: 'window.Notification',
          status: 'ERROR',
          error: winErr?.message,
        }));
      }
    }
  }

  // 2. Service Worker showNotification fallback (e.g. mobile Chrome or restricted environments)
  if (isServiceWorkerSupported()) {
    if (import.meta.env.DEV) {
      console.log('[NOTIF_DEBUG:6_API_SELECTION]', JSON.stringify({
        selectedApi: 'ServiceWorkerRegistration.showNotification',
        title,
        tag: resolvedTag,
      }));
    }
    try {
      let reg = swReg || (await navigator.serviceWorker.getRegistration());
      if (!reg) {
        reg = await registerServiceWorker();
      }

      // Race ready against a 500ms timeout so we NEVER block or hang
      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(() => resolve(reg), 500)),
      ]);

      const targetReg = readyReg || reg;
      if (targetReg && typeof targetReg.showNotification === 'function') {
        await targetReg.showNotification(title || 'InternHub Notification', notificationOptions);
        if (import.meta.env.DEV) {
          console.log('[NOTIF_DEBUG:7_EXECUTION_RESULT]', JSON.stringify({
            api: 'ServiceWorkerRegistration.showNotification',
            status: 'SUCCESS',
          }));
        }
        return true;
      }
    } catch (swErr) {
      if (import.meta.env.DEV) {
        console.warn('[NOTIF_DEBUG:7_EXECUTION_RESULT]', JSON.stringify({
          api: 'ServiceWorkerRegistration.showNotification',
          status: 'ERROR',
          error: swErr?.message,
        }));
      }
    }
  }

  return null;
};

