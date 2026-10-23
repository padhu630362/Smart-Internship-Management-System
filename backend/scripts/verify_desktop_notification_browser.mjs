import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User, ROLES } from '../src/models/User.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            if (msg.error) {
              cb.reject(new Error(msg.error.message || 'CDP Error'));
            } else {
              cb.resolve(msg.result);
            }
          }
        } catch {}
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runBrowserVerification() {
  console.log('=== VERIFYING REAL BROWSER DESKTOP NOTIFICATIONS ===');

  await connectDB();

  // Create temporary test student account
  const timestamp = Date.now();
  const passwordHash = await hashPassword('Password123!');
  const testStudent = await User.create({
    name: 'Browser Verification Student',
    email: `browser_notif_${timestamp}@example.com`,
    passwordHash,
    role: ROLES.STUDENT,
    status: 'active',
  });

  const token = signToken({
    id: testStudent._id.toString(),
    role: ROLES.STUDENT,
    email: testStudent.email,
  });

  console.log(`[USER] Created test student: ${testStudent.email}`);

  // Create temporary directory for Chrome profile
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'internhub-chrome-'));
  const port = 9222;

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log(`[CHROME] Launching Chrome on remote debugging port ${port}...`);

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ]);

  // Wait for CDP endpoint to be ready
  let targetWsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      if (targets && Array.isArray(targets)) {
        const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (pageTarget) {
          targetWsUrl = pageTarget.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
  }

  if (!targetWsUrl) {
    chromeProc.kill();
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error('Failed to connect to Chrome DevTools Protocol page target.');
  }

  console.log(`[CDP] Connected to browser target: ${targetWsUrl}`);
  const cdp = new CDPClient(targetWsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // Grant notifications permission to frontend origin
  await cdp.send('Browser.grantPermissions', {
    origin: 'http://localhost:5173',
    permissions: ['notifications'],
  });
  console.log('[PERMISSIONS] Notifications permission granted for http://localhost:5173');

  // Pre-seed auth session and attach spies BEFORE any page document loads
  const studentData = testStudent.toObject();
  const initScript = `
    sessionStorage.setItem('sims_auth_token', ${JSON.stringify(token)});
    sessionStorage.setItem('sims_auth_user', JSON.stringify(${JSON.stringify(studentData)}));

    window.__capturedDesktopNotifications = [];
    window.__inAppToastDetections = 0;

    // Spy on ServiceWorkerRegistration.prototype.showNotification
    if (typeof ServiceWorkerRegistration !== 'undefined') {
      const originalShowNotification = ServiceWorkerRegistration.prototype.showNotification;
      ServiceWorkerRegistration.prototype.showNotification = async function(title, options) {
        window.__capturedDesktopNotifications.push({
          source: 'ServiceWorkerRegistration.showNotification',
          title,
          options,
          timestamp: Date.now(),
        });
        return originalShowNotification.call(this, title, options);
      };
    }

    // Spy on window.Notification constructor
    if (typeof window.Notification !== 'undefined') {
      const OriginalNotification = window.Notification;
      const ProxyNotification = function(title, options) {
        window.__capturedDesktopNotifications.push({
          source: 'window.Notification',
          title,
          options,
          timestamp: Date.now(),
        });
        return new OriginalNotification(title, options);
      };
      ProxyNotification.permission = 'granted';
      ProxyNotification.requestPermission = OriginalNotification.requestPermission;
      window.Notification = ProxyNotification;
    }

    // Observe DOM mutations to check if in-app toast dialogue is displayed
    const observer = new MutationObserver(() => {
      const toasts = document.querySelectorAll('[role="alert"], [aria-live="polite"] [role="alert"]');
      if (toasts.length > 0) {
        window.__inAppToastDetections += toasts.length;
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  `;

  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: initScript,
  });

  // Navigate to /notifications
  console.log('[NAVIGATE] Loading http://localhost:5173/notifications ...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/notifications' });

  // Wait 4 seconds for page load, service worker registration, and socket connection
  await new Promise((r) => setTimeout(r, 4000));

  // Check current URL and page status
  const pageState = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => ({
        url: window.location.href,
        title: document.title,
        buttonCount: document.querySelectorAll('button').length,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean)
      }))()
    `,
    returnByValue: true,
  });
  console.log('[PAGE STATE]', pageState.result.value);

  // Check service worker status
  const swState = await cdp.send('Runtime.evaluate', {
    expression: `
      (async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return {
          registered: !!reg,
          scope: reg ? reg.scope : null,
          active: !!reg?.active,
          controller: !!navigator.serviceWorker.controller,
          permission: Notification.permission
        };
      })()
    `,
    awaitPromise: true,
    returnByValue: true,
  });
  console.log('[SW STATUS]', swState.result.value);

  // Click the "Test Desktop Alert" button
  console.log('[ACTION] Triggering "Test Desktop Alert" button...');
  const clickResult = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const testBtn = buttons.find(b =>
          b.innerText.includes('Test Desktop Alert') ||
          b.title?.includes('desktop notification') ||
          b.innerText.includes('Enable Desktop Alerts')
        );
        if (!testBtn) {
          return { found: false, buttons: buttons.map(b => b.innerText.trim()) };
        }
        testBtn.click();
        return { found: true, text: testBtn.innerText.trim() };
      })()
    `,
    returnByValue: true,
  });
  console.log('[CLICK RESULT]', clickResult.result.value);

  // Wait 3 seconds for dispatch and real-time socket delivery
  await new Promise((r) => setTimeout(r, 3000));

  // Audit results
  const auditResult = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => ({
        notifications: window.__capturedDesktopNotifications || [],
        inAppToastDetections: window.__inAppToastDetections || 0,
        toastsInDom: document.querySelectorAll('[role="alert"]').length
      }))()
    `,
    returnByValue: true,
  });

  const audit = auditResult.result.value;
  console.log('\n--- VERIFICATION AUDIT ---');
  console.log(`Captured native desktop notifications: ${audit.notifications.length}`);
  console.log('Notification calls:', JSON.stringify(audit.notifications, null, 2));
  console.log(`In-app toast detections: ${audit.inAppToastDetections}`);
  console.log(`Toasts in DOM: ${audit.toastsInDom}`);

  const hasValidNotification = audit.notifications.some(
    (n) =>
      n.title?.includes('Desktop Notification Test') ||
      n.title?.includes('InternHub Desktop Alert') ||
      n.options?.body?.includes('Real-time desktop system alerts')
  );

  const noInAppToast = audit.inAppToastDetections === 0 && audit.toastsInDom === 0;

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log(`✔ Genuine Native Desktop Alert Triggered: ${hasValidNotification ? 'PASS' : 'FAIL'}`);
  console.log(`✔ In-app Toast / Dialogue Suppressed (No Fake UI): ${noInAppToast ? 'PASS' : 'FAIL'}`);

  // Cleanup
  cdp.close();
  chromeProc.kill();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  await User.findByIdAndDelete(testStudent._id);
  await mongoose.disconnect();

  if (hasValidNotification && noInAppToast) {
    console.log('\n>>> SUCCESS: Browser delivery verified cleanly with real Chrome and native Web Notifications API! <<<\n');
    process.exit(0);
  } else {
    console.error('\n>>> ERROR: Browser verification failed assertions! <<<\n');
    process.exit(1);
  }
}

runBrowserVerification().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
