import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User, ROLES } from '../src/models/User.js';
import { Conversation, CONVERSATION_TYPES } from '../src/models/Conversation.js';
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

async function runChatNotificationVerification() {
  console.log('=== REAL-TIME CHAT DESKTOP NOTIFICATION BROWSER VERIFICATION ===');

  await connectDB();

  const timestamp = Date.now();
  const passwordHash = await hashPassword('Password123!');

  // 1. Create Mentor (Sender)
  const mentor = await User.create({
    name: 'Dr. Alan Turing',
    email: `alan_turing_${timestamp}@example.com`,
    passwordHash,
    role: ROLES.MENTOR,
    status: 'active',
  });
  const mentorToken = signToken({
    id: mentor._id.toString(),
    role: ROLES.MENTOR,
    email: mentor.email,
  });

  // 2. Create Student (Recipient)
  const student = await User.create({
    name: 'Ada Lovelace',
    email: `ada_lovelace_${timestamp}@example.com`,
    passwordHash,
    role: ROLES.STUDENT,
    status: 'active',
  });
  const studentToken = signToken({
    id: student._id.toString(),
    role: ROLES.STUDENT,
    email: student.email,
  });

  // 3. Create Direct Conversation between Mentor & Student
  const conversation = await Conversation.create({
    type: CONVERSATION_TYPES.DIRECT,
    participants: [mentor._id, student._id],
    creator: mentor._id,
    readReceipts: [
      { user: mentor._id, lastReadAt: new Date() },
      { user: student._id, lastReadAt: new Date(0) },
    ],
  });

  console.log(`[SETUP] Conversation created: ${conversation._id}`);
  console.log(`[SENDER] Mentor: ${mentor.name}`);
  console.log(`[RECIPIENT] Student: ${student.name}`);

  // 4. Launch Chrome with Student logged in
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'internhub-chat-chrome-'));
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

  const cdp = new CDPClient(targetWsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // Grant notifications permission to frontend origin
  await cdp.send('Browser.grantPermissions', {
    origin: 'http://localhost:5173',
    permissions: ['notifications'],
  });

  // Pre-seed auth session and attach spies BEFORE any page document loads
  const studentData = student.toObject();
  const initScript = `
    sessionStorage.setItem('sims_auth_token', ${JSON.stringify(studentToken)});
    sessionStorage.setItem('sims_auth_user', JSON.stringify(${JSON.stringify(studentData)}));

    window.__capturedDesktopNotifications = [];
    window.__mockWindowFocus = true;

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
  `;

  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: initScript });

  // TEST SCENARIO 1: Recipient is on another page (/notifications)
  console.log('\n--- SCENARIO 1: Student is on /notifications, receives chat message ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/notifications' });

  // Wait for socket to connect
  let connected = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const connRes = await cdp.send('Runtime.evaluate', {
      expression: 'Boolean(window.__simsSocketConnected)',
      returnByValue: true,
    });
    if (connRes.result.value) {
      connected = true;
      break;
    }
  }
  console.log(`[SOCKET STATUS] Connected to Socket.IO: ${connected}`);

  // Mentor sends chat message via HTTP API
  const messageText = `Hello Ada, your internship report has been approved! (Msg ID: ${timestamp})`;
  console.log(`[SENDER ACTION] Mentor sending message: "${messageText}"...`);

  const sendRes = await fetch(`http://localhost:5001/api/chat/conversations/${conversation._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mentorToken}`,
    },
    body: JSON.stringify({
      content: messageText,
      clientMsgId: `msg_${timestamp}_1`,
    }),
  });

  const sendResult = await sendRes.json();
  console.log(`[API RESPONSE] Message sent with status ${sendRes.status}:`, sendResult.success);

  // Wait 3 seconds for Socket.IO delivery to student
  await new Promise((r) => setTimeout(r, 3000));

  // Check captured notifications on student's browser
  const capturedResult = await cdp.send('Runtime.evaluate', {
    expression: 'window.__capturedDesktopNotifications',
    returnByValue: true,
  });

  const notifications = capturedResult.result.value || [];
  console.log(`[CDP AUDIT] Total captured notifications: ${notifications.length}`);
  console.log('Notification details:', JSON.stringify(notifications, null, 2));

  const chatNotif = notifications.find(
    (n) =>
      n.title?.includes(mentor.name) &&
      (n.options?.data?.url?.includes(conversation._id.toString()) ||
       n.options?.tag === `chat_${conversation._id}`)
  );

  console.log('\n--- SCENARIO 1 RESULTS ---');
  console.log(`✔ Genuine Native Desktop Alert Triggered: ${chatNotif ? 'PASS' : 'FAIL'}`);
  console.log(`✔ Correct Conversation URL (/chat?conversationId=...): ${chatNotif?.options?.data?.url ? 'PASS' : 'FAIL'}`);
  console.log(`✔ Correct Conversation Tag (chat_<id>): ${chatNotif?.options?.tag?.startsWith('chat_') ? 'PASS' : 'FAIL'}`);

  // TEST SCENARIO 2: Recipient is actively viewing the conversation (/chat?conversationId=...) with window focused
  console.log('\n--- SCENARIO 2: Student is actively viewing conversation on /chat (focused) ---');
  await cdp.send('Page.navigate', { url: `http://localhost:5173/chat?conversationId=${conversation._id}` });

  // Wait for socket to reconnect and active conversation to set
  await new Promise((r) => setTimeout(r, 3500));

  // Clear previous notifications array and ensure mock focus is active
  await cdp.send('Runtime.evaluate', {
    expression: 'window.__capturedDesktopNotifications = []; window.__mockWindowFocus = true;',
  });

  // Mentor sends second message while student is actively looking at it
  const message2Text = 'Here is the follow up detail for your project.';
  console.log(`[SENDER ACTION] Mentor sending 2nd message while Student is in active chat...`);

  await fetch(`http://localhost:5001/api/chat/conversations/${conversation._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mentorToken}`,
    },
    body: JSON.stringify({
      content: message2Text,
      clientMsgId: `msg_${timestamp}_2`,
    }),
  });

  await new Promise((r) => setTimeout(r, 2500));

  const activeAuditResult = await cdp.send('Runtime.evaluate', {
    expression: 'window.__capturedDesktopNotifications',
    returnByValue: true,
  });

  const activeNotifications = activeAuditResult.result.value || [];
  console.log(`[CDP AUDIT] Notifications captured while actively viewing chat: ${activeNotifications.length}`);

  const redundantSuppressed = activeNotifications.length === 0;
  console.log('\n--- SCENARIO 2 RESULTS ---');
  console.log(`✔ Redundant Desktop Alert Suppressed in Active Chat: ${redundantSuppressed ? 'PASS' : 'FAIL'}`);

  // TEST SCENARIO 3: Tab is in background / window unfocused while in /chat
  console.log('\n--- SCENARIO 3: Student is on /chat but window is unfocused (background) ---');
  await cdp.send('Runtime.evaluate', {
    expression: 'window.__capturedDesktopNotifications = []; window.__mockWindowFocus = false;',
  });

  const message3Text = 'Important: check this update while away.';
  console.log(`[SENDER ACTION] Mentor sending 3rd message while Student tab is unfocused...`);

  await fetch(`http://localhost:5001/api/chat/conversations/${conversation._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mentorToken}`,
    },
    body: JSON.stringify({
      content: message3Text,
      clientMsgId: `msg_${timestamp}_3`,
    }),
  });

  await new Promise((r) => setTimeout(r, 2500));

  const unfocusedAuditResult = await cdp.send('Runtime.evaluate', {
    expression: 'window.__capturedDesktopNotifications',
    returnByValue: true,
  });

  const unfocusedNotifications = unfocusedAuditResult.result.value || [];
  console.log(`[CDP AUDIT] Notifications captured while window unfocused: ${unfocusedNotifications.length}`);

  const unfocusedTriggered = unfocusedNotifications.length > 0;
  console.log('\n--- SCENARIO 3 RESULTS ---');
  console.log(`✔ Desktop Alert Triggered while window is in background/unfocused: ${unfocusedTriggered ? 'PASS' : 'FAIL'}`);

  // Cleanup
  cdp.close();
  chromeProc.kill();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  await User.findByIdAndDelete(mentor._id);
  await User.findByIdAndDelete(student._id);
  await Conversation.findByIdAndDelete(conversation._id);
  await mongoose.disconnect();

  if (chatNotif && redundantSuppressed && unfocusedTriggered) {
    console.log('\n>>> SUCCESS: All 3 Real-Time Chat Desktop Notification scenarios verified cleanly in real Chrome! <<<\n');
    process.exit(0);
  } else {
    console.error('\n>>> ERROR: Verification assertions failed! <<<\n');
    process.exit(1);
  }
}

runChatNotificationVerification().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
