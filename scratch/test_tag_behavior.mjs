import { spawn, execSync } from 'child_process';
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

async function testNotificationTags(browserName, executablePath, port) {
  console.log(`\n============================================================`);
  console.log(`TESTING NOTIFICATION TAG BEHAVIOR IN: ${browserName}`);
  console.log(`============================================================`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `internhub-tag-test-${port}-`));
  const proc = spawn(executablePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
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
    throw new Error('Could not connect via CDP');
  }

  const cdp = new CDPClient(targetWsUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  await cdp.send('Browser.grantPermissions', {
    origin: 'http://localhost:5173',
    permissions: ['notifications'],
  });

  await cdp.send('Page.navigate', { url: 'http://localhost:5173' });
  await new Promise((r) => setTimeout(r, 2500));

  // Test 1: User-triggered notification with NO tag
  console.log('\n--- TEST 1: User-triggered notification with NO tag ---');
  const res1 = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        try {
          const n = new Notification('Test 1: No Tag (' + new Date().toLocaleTimeString() + ')', {
            body: 'Notification with no tag specified.',
            icon: 'http://localhost:5173/internhub-icon.png',
          });
          return { success: true, title: n.title, tag: n.tag };
        } catch (e) {
          return { success: false, error: e.message };
        }
      })()
    `,
    returnByValue: true,
  });
  console.log('Result Test 1:', res1.result.value);

  await new Promise((r) => setTimeout(r, 2000));

  // Test 2: User-triggered notification with UNIQUE tag (includes timestamp/messageId)
  console.log('\n--- TEST 2: User-triggered notification with UNIQUE tag ---');
  const res2 = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        try {
          const uniqueTag = 'chat_unique_' + Date.now();
          const n = new Notification('Test 2: Unique Tag (' + new Date().toLocaleTimeString() + ')', {
            body: 'Notification with fresh unique tag: ' + uniqueTag,
            icon: 'http://localhost:5173/internhub-icon.png',
            tag: uniqueTag,
          });
          return { success: true, title: n.title, tag: n.tag };
        } catch (e) {
          return { success: false, error: e.message };
        }
      })()
    `,
    returnByValue: true,
  });
  console.log('Result Test 2:', res2.result.value);

  await new Promise((r) => setTimeout(r, 2000));

  // Test 3: User-triggered notification with REPEATED static tag 'test_notification'
  console.log('\n--- TEST 3: User-triggered notification with REPEATED static tag "test_notification" ---');
  const res3 = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        try {
          const n = new Notification('Test 3: Static Tag (' + new Date().toLocaleTimeString() + ')', {
            body: 'Notification with static tag test_notification.',
            icon: 'http://localhost:5173/internhub-icon.png',
            tag: 'test_notification',
          });
          return { success: true, title: n.title, tag: n.tag };
        } catch (e) {
          return { success: false, error: e.message };
        }
      })()
    `,
    returnByValue: true,
  });
  console.log('Result Test 3:', res3.result.value);

  await new Promise((r) => setTimeout(r, 3000));

  // Check what Windows Action Center stored
  const psCheck = `
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    $appIds = @('Chrome', 'Microsoft.MicrosoftEdge.Stable_8wekyb3d8bbwe!http://localhost:5173/')
    foreach ($a in $appIds) {
      try {
        $h = [Windows.UI.Notifications.ToastNotificationManager]::History.GetHistory($a)
        Write-Output "APP: $a (Total in history: $($h.Count))"
        foreach ($t in $h | Select-Object -First 3) {
          $b = $t.Content.GetElementsByTagName('text')
          $title = if ($b.Count -gt 0) { $b[0].InnerText } else { '' }
          Write-Output "   TAG: $($t.Tag) | TITLE: $title"
        }
      } catch {}
    }
  `;
  try {
    const psOut = execSync(`powershell -NoProfile -Command "${psCheck.replace(/\n/g, '; ')}"`, { encoding: 'utf-8' });
    console.log(`\n[WINDOWS ACTION CENTER CHECK]\n${psOut.trim()}`);
  } catch (e) {
    console.warn('Windows check error:', e.message);
  }

  cdp.close();
  proc.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
}

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  await testNotificationTags('Microsoft Edge', edgePath, 9240);
  await testNotificationTags('Google Chrome', chromePath, 9241);
}

main().catch(console.error);

