import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import { io as Client } from 'socket.io-client';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { initSocket, getIO } from '../src/socket.js';
import { User, ROLES } from '../src/models/User.js';
import { Notification, NOTIFICATION_TYPES } from '../src/models/Notification.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Phase 12: Genuine Real-Time Desktop System Notifications & Push Tests', () => {
  const timestamp = Date.now();
  const studentEmail = `student_desk_${timestamp}@example.com`;
  const mentorEmail = `mentor_desk_${timestamp}@example.com`;
  const defaultPassword = 'Password123!';

  let httpServer = null;
  let serverPort = null;
  let serverAddress = null;

  let studentUser = null;
  let studentToken = null;
  let mentorUser = null;
  let mentorToken = null;

  let studentSocket = null;

  before(async () => {
    await connectDB();

    httpServer = http.createServer(app);
    initSocket(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        serverPort = address.port;
        serverAddress = `http://localhost:${serverPort}`;
        resolve();
      });
    });

    const passwordHash = await hashPassword(defaultPassword);

    // Create student user
    studentUser = await User.create({
      name: 'Desktop Student',
      email: studentEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: 'active',
    });
    studentToken = signToken({
      id: studentUser._id.toString(),
      role: ROLES.STUDENT,
      email: studentEmail,
    });

    // Create mentor user
    mentorUser = await User.create({
      name: 'Desktop Mentor',
      email: mentorEmail,
      passwordHash,
      role: ROLES.MENTOR,
      status: 'active',
    });
    mentorToken = signToken({
      id: mentorUser._id.toString(),
      role: ROLES.MENTOR,
      email: mentorEmail,
    });

    // Connect authenticated Socket.IO client for student
    studentSocket = Client(serverAddress, {
      auth: { token: studentToken },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      studentSocket.on('connect', resolve);
      studentSocket.on('connect_error', reject);
    });
  });

  after(async () => {
    try {
      if (studentSocket && studentSocket.connected) {
        studentSocket.disconnect();
      }
      const io = getIO();
      if (io) {
        io.disconnectSockets(true);
      }
      if (httpServer && httpServer.listening) {
        httpServer.closeAllConnections?.();
        await new Promise((resolve) => httpServer.close(resolve));
      }
      if (studentUser) await User.findByIdAndDelete(studentUser._id);
      if (mentorUser) await User.findByIdAndDelete(mentorUser._id);
      await Notification.deleteMany({ recipient: { $in: [studentUser?._id, mentorUser?._id] } });
      await mongoose.disconnect();
    } catch {}
  });

  it('TC-DESK-01: VAPID public key endpoint returns configured key', async () => {
    const res = await request(app)
      .get('/api/notifications/push/vapid-key')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.publicKey === 'string');
    assert.ok(res.body.publicKey.length > 20);
  });

  it('TC-DESK-02: Register browser Web Push subscription for authenticated user', async () => {
    const fakeSubscription = {
      endpoint: `https://fcm.googleapis.com/fcm/send/fake_token_${Date.now()}`,
      expirationTime: null,
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4Ywf_cUpOQMg829z83nJ2c8N8',
        auth: 'tByhQtmHz02394g',
      },
    };

    const res = await request(app)
      .post('/api/notifications/push/subscribe')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ subscription: fakeSubscription });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify stored in MongoDB
    const updated = await User.findById(studentUser._id);
    assert.ok(updated.pushSubscriptions && updated.pushSubscriptions.length > 0);
    assert.equal(updated.pushSubscriptions[0].endpoint, fakeSubscription.endpoint);
  });

  it('TC-DESK-03: Remove browser Web Push subscription on unsubscribe', async () => {
    const fakeEndpoint = `https://fcm.googleapis.com/fcm/send/fake_to_remove_${Date.now()}`;
    await User.findByIdAndUpdate(studentUser._id, {
      $push: {
        pushSubscriptions: {
          endpoint: fakeEndpoint,
          keys: { p256dh: 'fake', auth: 'fake' },
        },
      },
    });

    const res = await request(app)
      .post('/api/notifications/push/unsubscribe')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ endpoint: fakeEndpoint });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const updated = await User.findById(studentUser._id);
    assert.ok(!updated.pushSubscriptions.some((s) => s.endpoint === fakeEndpoint));
  });

  it('TC-DESK-04: Test desktop notification endpoint triggers real-time socket delivery', async () => {
    const socketPromise = new Promise((resolve) => {
      studentSocket.once('notification:new', (notification) => {
        resolve(notification);
      });
    });

    const res = await request(app)
      .post('/api/notifications/test-desktop')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const receivedNotif = await socketPromise;
    assert.ok(receivedNotif);
    assert.equal(receivedNotif.title, 'InternHub Desktop Notification Test');
    assert.ok(receivedNotif.message.includes('Real-time desktop system alerts'));
  });

  it('TC-DESK-05: Authenticated isolation - user does not receive another user notifications', async () => {
    let wrongNotificationReceived = false;
    const listener = (notif) => {
      if (notif.title === 'Mentor Private Alert') {
        wrongNotificationReceived = true;
      }
    };
    studentSocket.on('notification:new', listener);

    // Dispatch notification to mentor only
    const { createAndDispatchNotification } = await import('../src/services/notificationService.js');
    await createAndDispatchNotification({
      recipientId: mentorUser._id,
      senderId: null,
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      title: 'Mentor Private Alert',
      message: 'This message should only be seen by the mentor.',
    });

    // Wait 250ms to ensure student socket never received it
    await new Promise((r) => setTimeout(r, 250));
    studentSocket.off('notification:new', listener);

    assert.equal(wrongNotificationReceived, false);
  });
});

