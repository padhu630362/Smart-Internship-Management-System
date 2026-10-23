// InternHub Service Worker — Native System Notifications & Web Push Engine

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Helper to ensure absolute URLs for notification icons on Windows Action Center
const resolveAbsoluteUrl = (path, fallback) => {
  const target = path || fallback;
  if (!target) return undefined;
  if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('data:')) {
    return target;
  }
  try {
    return new URL(target, self.location.origin).href;
  } catch {
    return target;
  }
};

// Handle incoming messages from the frontend page (e.g. SHOW_NOTIFICATION, SKIP_WAITING)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const safeOptions = {
      ...(options || {}),
      icon: resolveAbsoluteUrl(options?.icon, '/internhub-icon.png'),
      badge: resolveAbsoluteUrl(options?.badge, '/internhub-badge.png'),
    };
    event.waitUntil(
      self.registration.showNotification(
        title || 'InternHub Notification',
        safeOptions
      )
    );
  } else if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle incoming Web Push events from backend
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {
      title: 'InternHub Notification',
      message: event.data ? event.data.text() : 'You have a new update in your portal.',
    };
  }

  const title = payload.title || 'InternHub Notification';
  const options = {
    body: payload.message || payload.body || 'A new update is available in your portal.',
    icon: resolveAbsoluteUrl(payload.icon, '/internhub-icon.png'),
    badge: resolveAbsoluteUrl(payload.badge, '/internhub-badge.png'),
    tag: payload.tag || `notif_${Date.now()}`,
    renotify: true,
    data: {
      url: payload.link || payload.url || '/',
      metadata: payload.metadata || {},
      timestamp: Date.now(),
    },
    requireInteraction: Boolean(payload.requireInteraction),
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle user clicking on native desktop / OS notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetPath = event.notification.data?.url || '/';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an InternHub window / tab is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // 2. If no window is currently open, open a new browser window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

