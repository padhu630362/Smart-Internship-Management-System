import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

async function testBrowser(name, executablePath, port) {
  console.log(`\n========================================`);
  console.log(`DIAGNOSING: ${name}`);
  console.log(`Executable: ${executablePath}`);
  console.log(`========================================`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `internhub-diag-${name}-`));

  const proc = spawn(executablePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  let targetWsUrl = null;
  for (let i = 0; i < 20; i++) {
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
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to connect to ${name} via CDP.`);
  }

  const cdp = new CDPClient(targetWsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // Listen to console messages and page errors
  const consoleLogs = [];
  cdp.ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push({
          type: msg.params.type,
          args: msg.params.args.map((a) => a.value || a.description),
        });
      } else if (msg.method === 'Runtime.exceptionThrown') {
        consoleLogs.push({
          type: 'exception',
          text: msg.params.exceptionDetails?.text,
          exception: msg.params.exceptionDetails?.exception?.description,
        });
      }
    } catch {}
  });

  // Grant notifications permission
  await cdp.send('Browser.grantPermissions', {
    origin: 'http://localhost:5173',
    permissions: ['notifications'],
  });

  console.log(`[${name}] Loading http://localhost:5173 ...`);
  await cdp.send('Page.navigate', { url: 'http://localhost:5173' });
  await new Promise((r) => setTimeout(r, 3000));

  // Run comprehensive diagnostics in page context
  const evalResult = await cdp.send('Runtime.evaluate', {
    expression: `
      (async () => {
        const results = {};

        results.notificationSupported = 'Notification' in window;
        results.permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
        results.serviceWorkerSupported = 'serviceWorker' in navigator;

        try {
          const reg = await navigator.serviceWorker.getRegistration();
          results.swRegistered = !!reg;
          results.swScope = reg ? reg.scope : null;
          results.swActive = !!reg?.active;
          results.swController = !!navigator.serviceWorker.controller;
        } catch (e) {
          results.swError = e.message;
        }

        // Test 1: Window Notification constructor
        try {
          const n = new Notification('Diagnostic Window Notification', {
            body: 'Testing window.Notification directly',
            icon: '/internhub-icon.png',
          });
          results.windowNotificationSuccess = true;
          results.windowNotificationTitle = n.title;
        } catch (e) {
          results.windowNotificationError = e.message;
        }

        // Test 2: Service Worker showNotification
        try {
          let reg = await navigator.serviceWorker.getRegistration();
          if (!reg) {
            reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            await new Promise(r => setTimeout(r, 1000));
          }
          if (reg && typeof reg.showNotification === 'function') {
            await reg.showNotification('Diagnostic SW Notification', {
              body: 'Testing reg.showNotification directly',
              icon: '/internhub-icon.png',
            });
            results.swShowNotificationSuccess = true;
          } else {
            results.swShowNotificationSuccess = false;
            results.swShowNotificationReason = 'No reg or showNotification function';
          }
        } catch (e) {
          results.swShowNotificationError = e.message;
        }

        return results;
      })()
    `,
    awaitPromise: true,
    returnByValue: true,
  });

  console.log(`[${name} DIAGNOSTIC REPORT]`, JSON.stringify(evalResult.result.value, null, 2));
  console.log(`[${name} CONSOLE LOGS]`, JSON.stringify(consoleLogs, null, 2));

  cdp.close();
  proc.kill();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

  await testBrowser('Google Chrome', chromePath, 9222);
  await testBrowser('Microsoft Edge', edgePath, 9223);
}

main().catch(console.error);

