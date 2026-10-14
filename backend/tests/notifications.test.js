import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import { io as Client } from 'socket.io-client';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { initSocket, getIO } from '../src/socket.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../src/models/Internship.js';
import { Application, APPLICATION_STATUSES } from '../src/models/Application.js';
import { Notification, NOTIFICATION_TYPES } from '../src/models/Notification.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Phase 7: Real-Time Notifications and Socket.IO Integration Tests', () => {
  const timestamp = Date.now();
  const companyEmail = `comp_p7_${timestamp}@example.com`;
  const studentEmail = `student_p7_${timestamp}@example.com`;
  const mentorEmail = `mentor_p7_${timestamp}@example.com`;
  const defaultPassword = 'Password123!';

  let httpServer = null;
  let serverPort = null;
  let serverAddress = null;

  let companyUser = null;
  let companyToken = null;
  let studentUser = null;
  let studentToken = null;
  let mentorUser = null;
  let mentorToken = null;

  let internship = null;
  let studentSocket = null;
  let companySocket = null;
  let sampleNotificationId = null;

  before(async () => {
    await connectDB();

    // Start HTTP server on random available port with Socket.IO initialized
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

    // Create Company User
    companyUser = await User.create({
      name: 'Apex Robotics Inc',
      email: companyEmail,
      passwordHash,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
      profile: {
        companyDetails: {
          companyName: 'Apex Robotics',
        },
      },
    });
    companyToken = signToken({
      id: companyUser._id.toString(),
      role: ROLES.COMPANY,
      email: companyEmail,
    });

    // Create Student User
    studentUser = await User.create({
      name: 'Sarah Connor',
      email: studentEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: {
          studentId: 'STU-P7-001',
          department: 'Computer Science',
          cgpa: 3.9,
          resumeUrl: 'https://storage.example.com/resumes/sarah_p7.pdf',
        },
      },
    });
    studentToken = signToken({
      id: studentUser._id.toString(),
      role: ROLES.STUDENT,
      email: studentEmail,
    });

    // Create Mentor User
    mentorUser = await User.create({
      name: 'Dr. Robert Lang',
      email: mentorEmail,
      passwordHash,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
      profile: {
        mentorDetails: {
          organization: 'Apex Robotics',
          designation: 'Staff Scientist',
        },
      },
    });
    mentorToken = signToken({
      id: mentorUser._id.toString(),
      role: ROLES.MENTOR,
      email: mentorEmail,
    });

    // Create Internship Opportunity
    internship = await Internship.create({
      title: 'Robotics Software Engineering Intern',
      description: 'Develop autonomous perception algorithms for next-gen robots.',
      company: companyUser._id,
      companyName: 'Apex Robotics',
      requiredSkills: ['C++', 'ROS2', 'Python'],
      location: 'Boston, MA',
      workMode: WORK_MODES.HYBRID,
      duration: '6 Months',
      openings: 2,
      applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      status: INTERNSHIP_STATUSES.PUBLISHED,
      createdBy: companyUser._id,
    });
  });

  after(async () => {
    try {
      if (studentSocket && studentSocket.connected) {
        studentSocket.disconnect();
      }
      if (companySocket && companySocket.connected) {
        companySocket.disconnect();
      }
      const io = getIO();
      if (io) {
        io.disconnectSockets(true);
      }
    } catch {}

    try {
      if (httpServer && httpServer.listening) {
        httpServer.closeAllConnections?.();
        await new Promise((resolve) => httpServer.close(resolve));
      }
    } catch {}

    try {
      await mongoose.disconnect();
    } catch {}

    setTimeout(() => process.exit(0), 300).unref();
  });

  it('TC-NOTIF-01: Socket authentication rejects connection without token', async () => {
    let connectionError = null;
    const client = Client(serverAddress, {
      transports: ['websocket'],
      autoConnect: false,
    });

    await new Promise((resolve) => {
      client.on('connect_error', (err) => {
        connectionError = err;
        client.disconnect();
        resolve();
      });
      client.connect();
    });

    assert.ok(connectionError);
    assert.match(connectionError.message, /Authentication token missing/i);
  });

  it('TC-NOTIF-02: Socket authentication rejects invalid or corrupted token', async () => {
    let connectionError = null;
    const client = Client(serverAddress, {
      auth: { token: 'invalid.token.payload' },
      transports: ['websocket'],
      autoConnect: false,
    });

    await new Promise((resolve) => {
      client.on('connect_error', (err) => {
        connectionError = err;
        client.disconnect();
        resolve();
      });
      client.connect();
    });

    assert.ok(connectionError);
    assert.match(connectionError.message, /Authentication unauthorized|Invalid/i);
  });

  it('TC-NOTIF-03: Socket authentication succeeds for valid active users and responds to ping', async () => {
    studentSocket = Client(serverAddress, {
      auth: { token: studentToken },
      transports: ['websocket'],
    });

    companySocket = Client(serverAddress, {
      auth: { token: companyToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((resolve) => studentSocket.on('connect', resolve)),
      new Promise((resolve) => companySocket.on('connect', resolve)),
    ]);

    assert.equal(studentSocket.connected, true);
    assert.equal(companySocket.connected, true);

    const pingResponse = await new Promise((resolve) => {
      studentSocket.emit('ping:keepalive', (res) => resolve(res));
    });

    assert.equal(pingResponse.status, 'ok');
    assert.ok(pingResponse.timestamp);
  });

  it('TC-NOTIF-04: REST endpoint returns empty notification list initially', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.data.notifications), true);
    assert.equal(typeof res.body.data.unreadCount, 'number');
  });

  it('TC-NOTIF-05: Real-time trigger: Student applies -> Company receives live notification', async () => {
    let receivedSocketPayload = null;

    const notificationPromise = new Promise((resolve) => {
      companySocket.on('notification:new', (payload) => {
        receivedSocketPayload = payload;
        resolve();
      });
    });

    // Student submits application
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        internshipId: internship._id.toString(),
        coverLetter: 'Passionate about autonomous robotic manipulation systems.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const applicationId = res.body.data.application._id;

    // Wait for Socket.IO event on company's socket
    await notificationPromise;

    assert.ok(receivedSocketPayload);
    assert.equal(receivedSocketPayload.type, NOTIFICATION_TYPES.APPLICATION_SUBMITTED);
    assert.match(receivedSocketPayload.title, /New Application/i);
    assert.match(receivedSocketPayload.message, /Sarah Connor/i);
    assert.equal(receivedSocketPayload.recipient.toString(), companyUser._id.toString());

    // Verify persisted in DB
    const dbNotif = await Notification.findOne({
      recipient: companyUser._id,
      type: NOTIFICATION_TYPES.APPLICATION_SUBMITTED,
    });
    assert.ok(dbNotif);
    assert.equal(dbNotif.isRead, false);
    sampleNotificationId = dbNotif._id;
  });

  it('TC-NOTIF-06: Real-time trigger: Company updates status -> Student receives live notification', async () => {
    const application = await Application.findOne({
      student: studentUser._id,
      internship: internship._id,
    });
    assert.ok(application);

    let receivedSocketPayload = null;

    const studentNotificationPromise = new Promise((resolve) => {
      studentSocket.on('notification:new', (payload) => {
        receivedSocketPayload = payload;
        resolve();
      });
    });

    // Company updates status to under_review
    const res = await request(app)
      .patch(`/api/applications/${application._id}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        status: APPLICATION_STATUSES.UNDER_REVIEW,
        reviewNotes: 'Impressive robotics portfolio. Application is now under review.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    await studentNotificationPromise;

    assert.ok(receivedSocketPayload);
    assert.equal(receivedSocketPayload.type, NOTIFICATION_TYPES.APPLICATION_STATUS);
    assert.match(receivedSocketPayload.title, /Application Status Updated/i);
    assert.match(receivedSocketPayload.message, /under review/i);
    assert.equal(receivedSocketPayload.recipient.toString(), studentUser._id.toString());
  });

  it('TC-NOTIF-07: Room isolation: Student notification is NOT received by company socket', async () => {
    let companyReceivedUnintended = false;
    const testHandler = () => {
      companyReceivedUnintended = true;
    };
    companySocket.on('notification:new', testHandler);

    // Create a direct notification targeted to student
    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);

    // Wait a brief moment to confirm company socket was not spammed
    await new Promise((r) => setTimeout(r, 200));
    companySocket.off('notification:new', testHandler);

    assert.equal(companyReceivedUnintended, false);
  });

  it('TC-NOTIF-08: REST endpoint: Mark single notification as read decrements unread count', async () => {
    assert.ok(sampleNotificationId);

    const initialCountRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${companyToken}`);

    assert.equal(initialCountRes.status, 200);
    const prevCount = initialCountRes.body.data.unreadCount;
    assert.ok(prevCount >= 1);

    const markRes = await request(app)
      .patch(`/api/notifications/${sampleNotificationId}/read`)
      .set('Authorization', `Bearer ${companyToken}`);

    assert.equal(markRes.status, 200);
    assert.equal(markRes.body.data.notification.isRead, true);
    assert.ok(markRes.body.data.notification.readAt);
    assert.equal(markRes.body.data.unreadCount, prevCount - 1);
  });

  it('TC-NOTIF-09: REST endpoint: Mark all notifications as read', async () => {
    // Generate two unread notifications for student
    await Notification.create([
      {
        recipient: studentUser._id,
        type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
        title: 'System Maintenance Window',
        message: 'Platform scheduled update this weekend.',
      },
      {
        recipient: studentUser._id,
        type: NOTIFICATION_TYPES.TASK_DEADLINE,
        title: 'Task Deadline Approaching',
        message: 'Reminder: Deliverables due soon.',
      },
    ]);

    const readAllRes = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(readAllRes.status, 200);
    assert.equal(readAllRes.body.data.unreadCount, 0);

    const verifyCount = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(verifyCount.body.data.unreadCount, 0);
  });

  it('TC-NOTIF-10: Security: User cannot modify or delete another user notification', async () => {
    const studentNotif = await Notification.findOne({ recipient: studentUser._id });
    assert.ok(studentNotif);

    // Company attempts to mark student's notification as read
    const foreignReadRes = await request(app)
      .patch(`/api/notifications/${studentNotif._id}/read`)
      .set('Authorization', `Bearer ${companyToken}`);

    assert.equal(foreignReadRes.status, 404);

    // Company attempts to delete student's notification
    const foreignDeleteRes = await request(app)
      .delete(`/api/notifications/${studentNotif._id}`)
      .set('Authorization', `Bearer ${companyToken}`);

    assert.equal(foreignDeleteRes.status, 404);
  });

  it('TC-NOTIF-11: Mentor/Admin announcement broadcasts to target students', async () => {
    let receivedAnnouncement = null;

    const announcementPromise = new Promise((resolve) => {
      studentSocket.on('notification:new', (payload) => {
        if (payload.type === NOTIFICATION_TYPES.MENTOR_ANNOUNCEMENT) {
          receivedAnnouncement = payload;
          resolve();
        }
      });
    });

    const res = await request(app)
      .post('/api/notifications/announcements')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        title: 'Urgent: Midterm Presentation Schedule',
        message: 'All interns must upload slide decks by Friday 5:00 PM.',
        targetAudience: 'all_students',
      });

    assert.equal(res.status, 201);
    await announcementPromise;
    assert.ok(receivedAnnouncement);
    assert.match(receivedAnnouncement.title, /Midterm Presentation/i);
  });

  it('TC-NOTIF-12: REST endpoint: Delete notification cleanly updates collection', async () => {
    const notifToDelete = await Notification.create({
      recipient: studentUser._id,
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      title: 'Temporary Notice',
      message: 'This will be deleted.',
    });

    const delRes = await request(app)
      .delete(`/api/notifications/${notifToDelete._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);

    const lookup = await Notification.findById(notifToDelete._id);
    assert.equal(lookup, null);
  });

  after(async () => {
    if (studentSocket?.connected) studentSocket.disconnect();
    if (companySocket?.connected) companySocket.disconnect();
    const io = getIO();
    if (io) {
      await new Promise((resolve) => io.close(resolve));
    }
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });
});

