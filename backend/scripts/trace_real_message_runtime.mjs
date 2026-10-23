import { spawn, execSync } from 'child_process';
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
    this.eventListeners = [];
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
          for (const listener of this.eventListeners) {
            listener(msg);
          }
        } catch {}
      };
    });
  }

  onEvent(cb) {
    this.eventListeners.push(cb);
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

async function traceBrowserRuntime(browserName, executablePath, port) {
  console.log(`\n============================================================`);
  console.log(`TRACE REAL RUNTIME: ${browserName}`);
  console.log(`Executable: ${executablePath}`);
  console.log(`Debugging Port: ${port}`);
  console.log(`============================================================`);

  const timestamp = Date.now();
  const passwordHash = await hashPassword('Password123!');

  // 1. Create Mentor (Sender) & Student (Recipient)
  const mentor = await User.create({
    name: `Dr. ${browserName} Mentor`,
    email: `mentor_trace_${timestamp}@example.com`,
    passwordHash,
    role: ROLES.MENTOR,
    status: 'active',
  });
  const mentorToken = signToken({
    id: mentor._id.toString(),
    role: ROLES.MENTOR,
    email: mentor.email,
  });

  const student = await User.create({
    name: `Student ${browserName}`,
    email: `student_trace_${timestamp}@example.com`,
    passwordHash,
    role: ROLES.STUDENT,
    status: 'active',
  });
  const studentToken = signToken({
    id: student._id.toString(),
    role: ROLES.STUDENT,
    email: student.email,
  });

  const conversation = await Conversation.create({
    type: CONVERSATION_TYPES.DIRECT,
    participants: [mentor._id, student._id],
    creator: mentor._id,
    readReceipts: [
      { user: mentor._id, lastReadAt: new Date() },
      { user: student._id, lastReadAt: new Date(0) },
    ],
  });

  console.log(`[SETUP] Conversation ID: ${conversation._id}`);
  console.log(`[SETUP] Sender (Mentor): ${mentor.name} (${mentor._id})`);
  console.log(`[SETUP] Recipient (Student): ${student.name} (${student._id})`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `internhub-trace-${browserName.toLowerCase().replace(/\s+/g, '-')}-`));

  console.log(`[LAUNCH] Starting ${browserName} on port ${port}...`);
  const proc = spawn(executablePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  let targetWsUrl = null;
  for (let i = 0; i < 30; i++) {
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
    throw new Error(`Failed to connect to ${browserName} via CDP.`);
  }

  const cdp = new CDPClient(targetWsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const capturedLogs = [];
  cdp.onEvent((msg) => {
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map((a) => a.value !== undefined ? (typeof a.value === 'object' ? JSON.stringify(a.value) : a.value) : (a.description || ''));
      const text = args.join(' ');
      if (text.includes('[NOTIF_DEBUG:')) {
        capturedLogs.push({ type: 'NOTIF_DEBUG', text });
        console.log(`   >>> ${text}`);
      }
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error(`   [PAGE EXCEPTION]`, msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
    }
  });

  // Grant notifications permission to http://localhost:5173
  await cdp.send('Browser.grantPermissions', {
    origin: 'http://localhost:5173',
    permissions: ['notifications'],
  });

  // Seed sessionStorage with Student auth
  const studentData = student.toObject();
  const initScript = `
    sessionStorage.setItem('sims_auth_token', ${JSON.stringify(studentToken)});
    sessionStorage.setItem('sims_auth_user', JSON.stringify(${JSON.stringify(studentData)}));
  `;
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: initScript });

  console.log(`[NAVIGATE] Navigating ${browserName} to http://localhost:5173/notifications ...`);
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/notifications' });

  // Wait for socket to connect
  let connected = false;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const connRes = await cdp.send('Runtime.evaluate', {
      expression: 'Boolean(window.__simsSocketConnected)',
      returnByValue: true,
    });
    if (connRes.result?.value) {
      connected = true;
      break;
    }
  }
  console.log(`[SOCKET] Connected: ${connected}`);

  // Send ONE real message from mentor with retry
  const msgContent = `Hello ${student.name}, real-time trace at ${new Date().toLocaleTimeString()}!`;
  console.log(`[DISPATCH] Mentor sending real chat message via POST API...`);

  let sendRes = null;
  let sendJson = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      sendRes = await fetch(`http://localhost:5001/api/chat/conversations/${conversation._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({
          content: msgContent,
          clientMsgId: `msg_${timestamp}_trace_${attempt}`,
        }),
      });
      sendJson = await sendRes.json();
      if (sendRes.status === 201) break;
    } catch (err) {
      console.warn(`[RETRY] POST message attempt ${attempt + 1} failed: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`[API RESPONSE] Status: ${sendRes?.status}, MessageId: ${sendJson?.data?.message?._id}`);

  // Wait 4 seconds to observe all diagnostic stages
  console.log(`[AWAIT] Waiting 4 seconds for all 7 diagnostic stages to execute in browser...`);
  await new Promise((r) => setTimeout(r, 4000));

  // Check Windows Toast Manager via PowerShell
  console.log(`[WINDOWS AUDIT] Querying Windows Action Center for ${browserName} toasts...`);
  try {
    const psScript = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      $appIds = @('Chrome', 'MSEdge', 'Microsoft.MicrosoftEdge.Stable_8wekyb3d8bbwe!http://localhost:5173/')
      foreach ($a in $appIds) {
        try {
          $h = [Windows.UI.Notifications.ToastNotificationManager]::History.GetHistory($a)
          if ($h.Count -gt 0) {
            Write-Output "APP: $a COUNT: $($h.Count)"
            foreach ($t in $h | Select-Object -First 2) {
              Write-Output "   TAG: $($t.Tag)"
            }
          }
        } catch {}
      }
    `;
    const psOut = execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, '; ')}"`, { encoding: 'utf-8' });
    console.log(`[WINDOWS TOAST HISTORY OUTPUT]\n${psOut.trim()}`);
  } catch (psErr) {
    console.warn(`[WINDOWS AUDIT ERROR]`, psErr.message);
  }

  // Teardown
  cdp.close();
  proc.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}

  await User.findByIdAndDelete(mentor._id);
  await User.findByIdAndDelete(student._id);
  await Conversation.findByIdAndDelete(conversation._id);

  console.log(`\n--- SUMMARY OF 7 DIAGNOSTIC STAGES CAPTURED IN ${browserName} ---`);
  for (const log of capturedLogs) {
    console.log(`  ${log.text}`);
  }

  return capturedLogs;
}

async function main() {
  await connectDB();

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log('>>> TRACING REAL MESSAGE RUNTIME IN MICROSOFT EDGE <<<');
  const edgeLogs = await traceBrowserRuntime('Microsoft Edge', edgePath, 9230);

  console.log('\n>>> TRACING REAL MESSAGE RUNTIME IN GOOGLE CHROME <<<');
  const chromeLogs = await traceBrowserRuntime('Google Chrome', chromePath, 9231);

  await mongoose.disconnect();
}

main().catch(console.error);
