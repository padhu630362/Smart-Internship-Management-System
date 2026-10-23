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
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Conversation, CONVERSATION_TYPES } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { Notification, NOTIFICATION_TYPES } from '../src/models/Notification.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Phase 8: Secure Real-Time Chat & Group Messaging Tests', () => {
  const timestamp = Date.now();
  const coordinatorEmail = `coord_p8_${timestamp}@example.com`;
  const student1Email = `student1_p8_${timestamp}@example.com`;
  const student2Email = `student2_p8_${timestamp}@example.com`;
  const outsiderEmail = `outsider_p8_${timestamp}@example.com`;
  const defaultPassword = 'Password123!';

  let httpServer = null;
  let serverPort = null;
  let serverAddress = null;

  let coordinatorUser = null;
  let coordinatorToken = null;
  let student1User = null;
  let student1Token = null;
  let student2User = null;
  let student2Token = null;
  let outsiderUser = null;
  let outsiderToken = null;

  let directConversationId = null;
  let groupConversationId = null;

  let student1Socket = null;
  let coordinatorSocket = null;
  let outsiderSocket = null;

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

    // Coordinator
    coordinatorUser = await User.create({
      name: 'Dr. Grace Hopper',
      email: coordinatorEmail,
      passwordHash,
      role: ROLES.COORDINATOR,
      status: USER_STATUSES.ACTIVE,
      profile: {
        coordinatorDetails: { department: 'Engineering' },
      },
    });
    coordinatorToken = signToken({
      id: coordinatorUser._id.toString(),
      role: ROLES.COORDINATOR,
      email: coordinatorEmail,
    });

    // Student 1
    student1User = await User.create({
      name: 'Sarah Connor',
      email: student1Email,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { studentId: 'STU-P8-001', department: 'CS' },
      },
    });
    student1Token = signToken({
      id: student1User._id.toString(),
      role: ROLES.STUDENT,
      email: student1Email,
    });

    // Student 2
    student2User = await User.create({
      name: 'John Connor',
      email: student2Email,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { studentId: 'STU-P8-002', department: 'CS' },
      },
    });
    student2Token = signToken({
      id: student2User._id.toString(),
      role: ROLES.STUDENT,
      email: student2Email,
    });

    // Outsider Student
    outsiderUser = await User.create({
      name: 'Kyle Reese',
      email: outsiderEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { studentId: 'STU-P8-003', department: 'Math' },
      },
    });
    outsiderToken = signToken({
      id: outsiderUser._id.toString(),
      role: ROLES.STUDENT,
      email: outsiderEmail,
    });
  });

  after(async () => {
    try {
      if (student1Socket && student1Socket.connected) student1Socket.disconnect();
      if (coordinatorSocket && coordinatorSocket.connected) coordinatorSocket.disconnect();
      if (outsiderSocket && outsiderSocket.connected) outsiderSocket.disconnect();

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
      await Notification.deleteMany({
        recipient: { $in: [coordinatorUser?._id, student1User?._id, student2User?._id, outsiderUser?._id].filter(Boolean) },
      });
      await User.deleteMany({
        _id: { $in: [coordinatorUser?._id, student1User?._id, student2User?._id, outsiderUser?._id].filter(Boolean) },
      });
      await mongoose.disconnect();
    } catch {}

    setTimeout(() => process.exit(0), 300).unref();
  });

  it('TC-CHAT-01: Direct conversation creation and idempotency check', async () => {
    const res1 = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: 'direct',
        participantId: coordinatorUser._id.toString(),
      });

    assert.equal(res1.status, 201);
    assert.equal(res1.body.success, true);
    const conv1 = res1.body.data.conversation || res1.body.data;
    assert.equal(conv1.type, 'direct');
    assert.equal(conv1.participants.length, 2);
    directConversationId = conv1._id.toString();

    // Idempotency: Posting again returns existing conversation with 200
    const res2 = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        type: 'direct',
        participantId: student1User._id.toString(),
      });

    assert.equal(res2.status, 200);
    const conv2 = res2.body.data.conversation || res2.body.data;
    assert.equal(conv2._id.toString(), directConversationId);
  });

  it('TC-CHAT-02: Message persistence in MongoDB', async () => {
    const messageText = 'Hello Coordinator, I have a question regarding my internship application.';

    const res = await request(app)
      .post(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ content: messageText });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const msgData = res.body.data.message || res.body.data;
    assert.equal(msgData.content, messageText);
    assert.equal(msgData.sender._id.toString(), student1User._id.toString());

    // Verify stored in DB
    const savedMsg = await Message.findById(msgData._id);
    assert.ok(savedMsg);
    assert.equal(savedMsg.content, messageText);

    // Verify Conversation lastMessage updated
    const convo = await Conversation.findById(directConversationId);
    assert.equal(convo.lastMessage.toString(), savedMsg._id.toString());

    // Verify in-app notification created for recipient
    const notif = await Notification.findOne({
      recipient: coordinatorUser._id,
      type: NOTIFICATION_TYPES.NEW_MESSAGE,
    });
    assert.ok(notif, 'Real-time in-app notification must be dispatched to recipient');
    assert.ok(notif.title.includes(student1User.name));
    assert.equal(notif.link, `/chat?conversationId=${directConversationId}`);
  });

  it('TC-CHAT-03: Security - Non-member cannot access conversation details', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${directConversationId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error?.message || res.body.message, /access denied|not authorized|not a member/i);
  });

  it('TC-CHAT-04: Security - Non-member cannot read conversation messages', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('TC-CHAT-05: Security - Non-member cannot send messages to conversation', async () => {
    const res = await request(app)
      .post(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ content: 'I am eavesdropping!' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('TC-CHAT-06: Security - Students cannot create group conversations', async () => {
    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: 'group',
        name: 'Unauthorized Student Group',
        participantIds: [student2User._id.toString()],
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error?.message || res.body.message, /only administrators, coordinators/i);
  });

  it('TC-CHAT-07: Coordinator can create group conversation', async () => {
    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        type: 'group',
        name: 'Summer Interns Cohort 2026',
        description: 'Official group for all onboarded summer interns.',
        participantIds: [student1User._id.toString(), student2User._id.toString()],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const groupData = res.body.data.conversation || res.body.data;
    assert.equal(groupData.name, 'Summer Interns Cohort 2026');
    assert.equal(groupData.participants.length, 3); // Coordinator + student1 + student2
    groupConversationId = groupData._id.toString();
  });

  it('TC-CHAT-08: Group admin can manage members (add and remove)', async () => {
    // 1. Add outsiderUser to group
    const addRes = await request(app)
      .patch(`/api/chat/conversations/${groupConversationId}/members`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        action: 'add',
        userId: outsiderUser._id.toString(),
      });

    assert.equal(addRes.status, 200);
    const addGroup = addRes.body.data.conversation || addRes.body.data;
    assert.equal(addGroup.participants.length, 4);

    // 2. Remove outsiderUser from group
    const removeRes = await request(app)
      .patch(`/api/chat/conversations/${groupConversationId}/members`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        action: 'remove',
        userId: outsiderUser._id.toString(),
      });

    assert.equal(removeRes.status, 200);
    const removeGroup = removeRes.body.data.conversation || removeRes.body.data;
    assert.equal(removeGroup.participants.length, 3);
  });

  it('TC-CHAT-09: Real-time Socket.IO delivery of direct and group chat messages', async () => {
    student1Socket = Client(serverAddress, {
      auth: { token: student1Token },
      transports: ['websocket'],
    });

    coordinatorSocket = Client(serverAddress, {
      auth: { token: coordinatorToken },
      transports: ['websocket'],
    });

    await Promise.race([
      Promise.all([
        new Promise((resolve) => student1Socket.on('connect', resolve)),
        new Promise((resolve) => coordinatorSocket.on('connect', resolve)),
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Socket connect timeout')), 5000)),
    ]);

    // Join conversation rooms on socket
    await Promise.all([
      new Promise((resolve) => {
        coordinatorSocket.emit('conversation:join', { conversationId: groupConversationId }, (res) => {
          assert.equal(res.success, true);
          resolve();
        });
      }),
      new Promise((resolve) => {
        student1Socket.emit('conversation:join', { conversationId: groupConversationId }, (res) => {
          assert.equal(res.success, true);
          resolve();
        });
      }),
    ]);

    // Student 1 sends a message in the group conversation
    const messagePromise = new Promise((resolve) => {
      coordinatorSocket.once('chat:message', (payload) => {
        resolve(payload);
      });
    });

    const userAlertPromise = new Promise((resolve) => {
      coordinatorSocket.once('chat:new_message', (payload) => {
        resolve(payload);
      });
    });

    const sendRes = await request(app)
      .post(`/api/chat/conversations/${groupConversationId}/messages`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ content: 'Welcome everyone to the 2026 cohort!' });

    assert.equal(sendRes.status, 201);

    const [chatMsgEvent, userAlertEvent] = await Promise.all([
      messagePromise,
      userAlertPromise,
    ]);

    assert.equal(chatMsgEvent.conversationId, groupConversationId);
    assert.equal(chatMsgEvent.message.content, 'Welcome everyone to the 2026 cohort!');
    assert.equal(userAlertEvent.conversationId, groupConversationId);
  });

  it('TC-CHAT-10: Socket membership check rejects unauthorized socket room join', async () => {
    outsiderSocket = Client(serverAddress, {
      auth: { token: outsiderToken },
      transports: ['websocket'],
    });

    await new Promise((resolve) => outsiderSocket.on('connect', resolve));

    const joinRes = await new Promise((resolve) => {
      outsiderSocket.emit('conversation:join', { conversationId: groupConversationId }, (res) => {
        resolve(res);
      });
    });

    assert.equal(joinRes.success, false);
    assert.match(joinRes.error, /unauthorized|not authorized/i);
  });

  it('TC-CHAT-11: Validation - Empty, whitespace, or oversized messages rejected', async () => {
    // Empty
    const emptyRes = await request(app)
      .post(`/api/chat/conversations/${groupConversationId}/messages`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ content: '   ' });

    assert.equal(emptyRes.status, 400);
    assert.equal(emptyRes.body.success, false);
    assert.match(emptyRes.body.error?.message || emptyRes.body.message, /cannot be empty/i);

    // Oversized (> 2000 chars)
    const longRes = await request(app)
      .post(`/api/chat/conversations/${groupConversationId}/messages`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ content: 'a'.repeat(2001) });

    assert.equal(longRes.status, 400);
    assert.equal(longRes.body.success, false);
    assert.match(longRes.body.error?.message || longRes.body.message, /2000/i);
  });

  it('TC-CHAT-12: Read receipt updates unread counter and emits socket event', async () => {
    const readPromise = new Promise((resolve) => {
      student1Socket.once('chat:read_update', (payload) => {
        resolve(payload);
      });
    });

    const readRes = await request(app)
      .patch(`/api/chat/conversations/${groupConversationId}/read`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    assert.equal(readRes.status, 200);
    assert.equal(readRes.body.success, true);
    assert.equal(readRes.body.data.unreadCount, 0);

    const socketReadPayload = await readPromise;
    assert.equal(socketReadPayload.conversationId, groupConversationId);
    assert.equal(socketReadPayload.userId, coordinatorUser._id.toString());
  });

  it('TC-CHAT-13: Contacts and online users endpoints return accurate data', async () => {
    const contactsRes = await request(app)
      .get('/api/chat/contacts')
      .set('Authorization', `Bearer ${student1Token}`);

    assert.equal(contactsRes.status, 200);
    assert.equal(contactsRes.body.success, true);
    const contacts = contactsRes.body.data.contacts || contactsRes.body.data;
    assert.ok(Array.isArray(contacts));
    assert.ok(contacts.length >= 1);

    const onlineRes = await request(app)
      .get('/api/chat/online-users')
      .set('Authorization', `Bearer ${student1Token}`);

    assert.equal(onlineRes.status, 200);
    const onlineUsers = onlineRes.body.data.onlineUserIds || onlineRes.body.data;
    assert.ok(Array.isArray(onlineUsers));
    // student1, coordinator, and outsider sockets are connected
    assert.ok(onlineUsers.includes(student1User._id.toString()));
    assert.ok(onlineUsers.includes(coordinatorUser._id.toString()));
  });

  it('TC-CHAT-14: Rate limiting triggers 429 when flood threshold is exceeded', async () => {
    const convRes = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        type: 'direct',
        recipientId: coordinatorUser._id.toString(),
      });

    assert.ok([200, 201].includes(convRes.status));
    const testConvId = (convRes.body.data.conversation || convRes.body.data)._id.toString();

    // Fire 65 rapid parallel requests to exceed 60 msgs/min rate limit
    const responses = await Promise.all(
      Array.from({ length: 65 }).map((_, i) =>
        request(app)
          .post(`/api/chat/conversations/${testConvId}/messages`)
          .set('Authorization', `Bearer ${student2Token}`)
          .send({ content: `Burst spam check #${i}` })
      )
    );

    const rateLimitedResponses = responses.filter((r) => r.status === 429);
    assert.ok(
      rateLimitedResponses.length > 0,
      'Rate limiter should return 429 once threshold (60 msgs/min) is exceeded'
    );
    assert.match(
      rateLimitedResponses[0].body.error?.message || rateLimitedResponses[0].body.message,
      /rate limit|too fast/i
    );
  });

  it('TC-CHAT-15: Message emoji reactions toggle on and off properly', async () => {
    // 1. Send a message
    const sendRes = await request(app)
      .post(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ content: 'Hello reaction testing message' });

    assert.equal(sendRes.status, 201);
    const msgId = sendRes.body.data.message._id;

    // 2. Student1 adds 👍 reaction
    const reactRes1 = await request(app)
      .patch(`/api/chat/messages/${msgId}/react`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ emoji: '👍' });

    assert.equal(reactRes1.status, 200);
    assert.equal(reactRes1.body.data.reactions.length, 1);
    assert.equal(reactRes1.body.data.reactions[0].emoji, '👍');
    assert.equal(reactRes1.body.data.reactions[0].user._id.toString(), student1User._id.toString());

    // 3. Coordinator adds ❤️ reaction
    const reactRes2 = await request(app)
      .patch(`/api/chat/messages/${msgId}/react`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ emoji: '❤️' });

    assert.equal(reactRes2.status, 200);
    assert.equal(reactRes2.body.data.reactions.length, 2);

    // 4. Student1 clicks 👍 again to toggle off
    const reactRes3 = await request(app)
      .patch(`/api/chat/messages/${msgId}/react`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ emoji: '👍' });

    assert.equal(reactRes3.status, 200);
    assert.equal(reactRes3.body.data.reactions.length, 1);
    assert.equal(reactRes3.body.data.reactions[0].emoji, '❤️');
  });

  
  let uploadedFileKey = null;
  let testMsgIdForEdit = null;
  let testMsgIdForDelete = null;

  it('TC-CHAT-16: Upload attachment & send message with file (PDF)', async () => {
    const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    const res = await request(app)
      .post(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${student1Token}`)
      .field('content', 'Here is my internship verification document.')
      .attach('file', dummyPdf, 'internship_verification.pdf');

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const msg = res.body.data.message;
    assert.ok(msg.attachments && msg.attachments.length === 1);
    assert.equal(msg.attachments[0].fileName, 'internship_verification.pdf');
    assert.equal(msg.attachments[0].fileType, 'pdf');
    assert.ok(msg.attachments[0].fileKey);
    uploadedFileKey = msg.attachments[0].fileKey;
    testMsgIdForEdit = msg._id;
  });

  it('TC-CHAT-17: Authenticated attachment streaming download', async () => {
    assert.ok(uploadedFileKey, 'File key must be present from TC-CHAT-16');

    const res = await request(app)
      .get(`/api/chat/attachments/${uploadedFileKey}`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /pdf/i);
  });

  it('TC-CHAT-18: Security - Non-member cannot download attachment', async () => {
    assert.ok(uploadedFileKey, 'File key must be present from TC-CHAT-16');

    const res = await request(app)
      .get(`/api/chat/attachments/${uploadedFileKey}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message || res.body.error?.message, /access denied|not authorized/i);
  });

  it('TC-CHAT-19: Message editing by author', async () => {
    assert.ok(testMsgIdForEdit, 'Message ID must be present');

    const res = await request(app)
      .patch(`/api/chat/messages/${testMsgIdForEdit}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ content: 'Updated: Document has been verified and signed.' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.message.content, 'Updated: Document has been verified and signed.');
    assert.equal(res.body.data.message.isEdited, true);
    assert.ok(res.body.data.message.editedAt);
  });

  it('TC-CHAT-20: Security - Non-author cannot edit someone else message', async () => {
    assert.ok(testMsgIdForEdit, 'Message ID must be present');

    const res = await request(app)
      .patch(`/api/chat/messages/${testMsgIdForEdit}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ content: 'Hacked message edit attempt' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('TC-CHAT-21: Delete message for everyone', async () => {
    const sendRes = await request(app)
      .post(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ content: 'Message to be retracted completely' });

    assert.equal(sendRes.status, 201);
    const msgId = sendRes.body.data.message._id;

    const delRes = await request(app)
      .delete(`/api/chat/messages/${msgId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ mode: 'everyone' });

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);
    assert.equal(delRes.body.data.mode, 'everyone');

    const inDb = await Message.findById(msgId);
    assert.equal(inDb.isDeleted, true);
    assert.equal(inDb.content, 'This message was deleted');
    assert.equal(inDb.attachments.length, 0);
  });

  it('TC-CHAT-22: Delete message for me only', async () => {
    const sendRes = await request(app)
      .post(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ content: 'Message to delete for me only' });

    assert.equal(sendRes.status, 201);
    const msgId = sendRes.body.data.message._id;

    const delRes = await request(app)
      .delete(`/api/chat/messages/${msgId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ mode: 'me' });

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.data.mode, 'me');

    const stuListRes = await request(app)
      .get(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${student1Token}`);

    assert.equal(stuListRes.status, 200);
    const stuMessages = stuListRes.body.data.messages;
    assert.ok(!stuMessages.some((m) => m._id.toString() === msgId.toString()));

    const coordListRes = await request(app)
      .get(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    assert.equal(coordListRes.status, 200);
    const coordMessages = coordListRes.body.data.messages;
    assert.ok(coordMessages.some((m) => m._id.toString() === msgId.toString()));
  });

  it('TC-CHAT-23: Reply to message with parent reference', async () => {
    const parentRes = await request(app)
      .post(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ content: 'What is your current project status?' });

    assert.equal(parentRes.status, 201);
    const parentId = parentRes.body.data.message._id;

    const replyRes = await request(app)
      .post(`/api/chat/conversations/${directConversationId}/messages`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        content: 'Milestone 2 is complete and all unit tests pass.',
        replyTo: parentId,
      });

    assert.equal(replyRes.status, 201);
    const replyMsg = replyRes.body.data.message;
    assert.ok(replyMsg.replyTo);
    assert.equal((replyMsg.replyTo._id || replyMsg.replyTo).toString(), parentId.toString());
    testMsgIdForDelete = replyMsg._id;
  });

  it('TC-CHAT-24: Forward message to another conversation', async () => {
    assert.ok(testMsgIdForDelete, 'Source message ID must exist');

    const fwdRes = await request(app)
      .post(`/api/chat/messages/${testMsgIdForDelete}/forward`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ targetConversationIds: [groupConversationId] });

    assert.equal(fwdRes.status, 201);
    assert.equal(fwdRes.body.success, true);
    assert.ok(fwdRes.body.data.forwardedMessages.length === 1);
    assert.equal(
      fwdRes.body.data.forwardedMessages[0].content,
      'Milestone 2 is complete and all unit tests pass.'
    );
  });

  it('TC-CHAT-25: Presence and last-seen tracking', async () => {
    const userInDb = await User.findById(student1User._id);
    assert.ok(userInDb.lastSeen);
    assert.ok(userInDb.lastSeen instanceof Date);
  });

  after(async () => {
    if (student1Socket?.connected) student1Socket.disconnect();
    if (coordinatorSocket?.connected) coordinatorSocket.disconnect();
    if (outsiderSocket?.connected) outsiderSocket.disconnect();
    const io = getIO();
    if (io) {
      await new Promise((resolve) => io.close(resolve));
    }
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });
});

