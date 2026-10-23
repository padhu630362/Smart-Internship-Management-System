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

async function verifyBrowserChatNotifications(browserName, executablePath, port) {
  console.log(`\n============================================================`);
  console.log(`TESTING BROWSER: ${browserName}`);
  console.log(`Path: ${executablePath}`);
  console.log(`Port: ${port}`);
  console.log(`============================================================`);

  const timestamp = Date.now();
  const passwordHash = await hashPassword('Password123!');

  // 1. Create Sender (Mentor)
  const mentor = await User.create({
    name: `${browserName} Mentor`,
    email: `mentor_${browserName.toLowerCase().replace(/\s+/g, '_')}_${timestamp}@example.com`,
    passwordHash,
    role: ROLES.MENTOR,
    status: 'active',
  });
  const mentorToken = signToken({
    id: mentor._id.toString(),
    role: ROLES.MENTOR,
    email: mentor.email,
  });

  // 2. Create Recipient (Student)
  const student = await User.create({
    name: `${browserName} Student`,
    email: `student_${browserName.toLowerCase().replace(/\s+/g, '_')}_${timestamp}@example.com`,
    passwordHash,
    role: ROLES.STUDENT,
    status: 'active',
  });
  const studentToken = signToken({
    id: student._id.toString(),
    role: ROLES.STUDENT,
    email: student.email,
  });

  // 3. Create Conversation
  const conversation = await Conversation.create({
    type: CONVERSATION_TYPES.DIRECT,
    participants: [mentor._id, student._id],
    creator: mentor._id,
    readReceipts: [
      { user: mentor._id, lastReadAt: new Date() },
      { user: student._id, lastReadAt: new Date(0) },
    ],
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `internhub-e2e-${browserName.toLowerCase().replace(/\s+/g, '-')}-`));

  console.log(`[${browserName}] Launching browser instance...`);
  const proc = spawn(executablePath, [
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
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 400));
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
    proc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    throw new Error(`Failed to connect to ${browserName} via CDP on port ${port}.`);
  }

  const cdp = new CDPClient(targetWsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  await cdp.send('Browser.grantPermissions', {
    origin: 'http://localhost:5173',
    permissions: ['notifications'],
  });

  const studentData = student.toObject();
  const initScript = `
    sessionStorage.setItem('sims_auth_token', ${JSON.stringify(studentToken)});
    sessionStorage.setItem('sims_auth_user', JSON.stringify(${JSON.stringify(studentData)}));

    window.__capturedDesktopNotifications = [];
    window.__mockWindowFocus = true;

    // Intercept ServiceWorkerRegistration.prototype.showNotification
    if (typeof ServiceWorkerRegistration !== 'undefined') {
      const origSW = ServiceWorkerRegistration.prototype.showNotification;
      ServiceWorkerRegistration.prototype.showNotification = async function(title, options) {
        window.__capturedDesktopNotifications.push({
          source: 'ServiceWorkerRegistration.showNotification',
          title,
          options,
          timestamp: Date.now(),
        });
        return origSW.call(this, title, options);
      };
    }

    // Intercept window.Notification constructor
    if (typeof window.Notification !== 'undefined') {
      const OrigNotif = window.Notification;
      const ProxyNotif = function(title, options) {
        window.__capturedDesktopNotifications.push({
          source: 'window.Notification',
          title,
          options,
          timestamp: Date.now(),
        });
        return new OrigNotif(title, options);
      };
      ProxyNotif.permission = 'granted';
      ProxyNotif.requestPermission = OrigNotif.requestPermission;
      window.Notification = ProxyNotif;
    }
  `;

  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: initScript });

  // SCENARIO 1: Student is on /notifications, receives chat message
  console.log(`[${browserName}] Scenario 1: Recipient on /notifications receives chat message...`);
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
  console.log(`[${browserName}] Socket Connected: ${connected}`);

  const msg1Content = `Hello from ${browserName} test!`;
  const sendRes1 = await fetch(`http://localhost:5001/api/chat/conversations/${conversation._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mentorToken}`,
    },
    body: JSON.stringify({
      content: msg1Content,
      clientMsgId: `msg_${timestamp}_1`,
    }),
  });
  console.log(`[${browserName}] Message 1 HTTP Send status: ${sendRes1.status}`);

  await new Promise((r) => setTimeout(r, 3000));

  const captured1 = await cdp.send('Runtime.evaluate', {
    expression: 'window.__capturedDesktopNotifications',
    returnByValue: true,
  });
  const notifs1 = captured1.result.value || [];
  console.log(`[${browserName}] Captured notifications in Scenario 1: ${notifs1.length}`);

  const matchingNotif1 = notifs1.find(
    (n) =>
      n.title?.includes(mentor.name) &&
      (n.options?.data?.url?.includes(conversation._id.toString()) ||
       n.options?.tag === `chat_${conversation._id}`)
  );

  const scenario1Pass = Boolean(matchingNotif1);
  console.log(`[${browserName} RESULT 1] Desktop Notification Fired: ${scenario1Pass ? 'PASS' : 'FAIL'}`);
  if (matchingNotif1) {
    console.log(`[${browserName} DETAILS] Title: "${matchingNotif1.title}", URL: "${matchingNotif1.options?.data?.url}", Tag: "${matchingNotif1.options?.tag}"`);
  }

  // SCENARIO 2: Recipient is actively viewing the conversation (/chat?conversationId=...) with window focused
  console.log(`\n[${browserName}] Scenario 2: Recipient actively viewing open chat (focused)...`);
  await cdp.send('Page.navigate', { url: `http://localhost:5173/chat?conversationId=${conversation._id}` });
  await new Promise((r) => setTimeout(r, 3500));

  await cdp.send('Runtime.evaluate', {
    expression: 'window.__capturedDesktopNotifications = []; window.__mockWindowFocus = true;',
  });

  const sendRes2 = await fetch(`http://localhost:5001/api/chat/conversations/${conversation._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mentorToken}`,
    },
    body: JSON.stringify({
      content: 'Message 2 while in active chat view',
      clientMsgId: `msg_${timestamp}_2`,
    }),
  });
  console.log(`[${browserName}] Message 2 HTTP Send status: ${sendRes2.status}`);

  await new Promise((r) => setTimeout(r, 2500));

  const captured2 = await cdp.send('Runtime.evaluate', {
    expression: 'window.__capturedDesktopNotifications',
    returnByValue: true,
  });
  const notifs2 = captured2.result.value || [];
  const scenario2Pass = notifs2.length === 0;
  console.log(`[${browserName} RESULT 2] Redundant Desktop Alert Suppressed: ${scenario2Pass ? 'PASS' : 'FAIL'} (Count: ${notifs2.length})`);

  // SCENARIO 3: Recipient is on /chat but window unfocused (background tab)
  console.log(`\n[${browserName}] Scenario 3: Recipient on /chat with tab unfocused (background)...`);
  await cdp.send('Runtime.evaluate', {
    expression: 'window.__capturedDesktopNotifications = []; window.__mockWindowFocus = false;',
  });

  const sendRes3 = await fetch(`http://localhost:5001/api/chat/conversations/${conversation._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mentorToken}`,
    },
    body: JSON.stringify({
      content: 'Message 3 while window is in background',
      clientMsgId: `msg_${timestamp}_3`,
    }),
  });
  console.log(`[${browserName}] Message 3 HTTP Send status: ${sendRes3.status}`);

  await new Promise((r) => setTimeout(r, 2500));

  const captured3 = await cdp.send('Runtime.evaluate', {
    expression: 'window.__capturedDesktopNotifications',
    returnByValue: true,
  });
  const notifs3 = captured3.result.value || [];
  const scenario3Pass = notifs3.length > 0;
  console.log(`[${browserName} RESULT 3] Desktop Alert Triggered while window unfocused: ${scenario3Pass ? 'PASS' : 'FAIL'} (Count: ${notifs3.length})`);

  // Teardown
  cdp.close();
  proc.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}

  await User.findByIdAndDelete(mentor._id);
  await User.findByIdAndDelete(student._id);
  await Conversation.findByIdAndDelete(conversation._id);

  const allPassed = scenario1Pass && scenario2Pass && scenario3Pass;
  console.log(`\n>>> [${browserName}] Overall Result: ${allPassed ? 'ALL TESTS PASSED' : 'FAILED'} <<<\n`);
  return allPassed;
}

async function main() {
  await connectDB();

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

  console.log('STARTING DUAL-BROWSER VERIFICATION FOR CHROME & EDGE...');

  const chromePassed = await verifyBrowserChatNotifications('Google Chrome', chromePath, 9222);
  const edgePassed = await verifyBrowserChatNotifications('Microsoft Edge', edgePath, 9223);

  await mongoose.disconnect();

  if (chromePassed && edgePassed) {
    console.log('========================================================================');
    console.log('SUCCESS: Desktop notifications verified cleanly in BOTH Chrome and Edge!');
    console.log('========================================================================');
    process.exit(0);
  } else {
    console.error('========================================================================');
    console.error(`FAILED: Chrome Passed=${chromePassed}, Edge Passed=${edgePassed}`);
    console.error('========================================================================');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});

