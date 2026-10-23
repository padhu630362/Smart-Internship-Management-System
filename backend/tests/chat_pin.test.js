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
import { Message, ATTACHMENT_TYPES } from '../src/models/Message.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Feature: Pin and Unpin Messages Tests', () => {
  const timestamp = Date.now();
  const mentorEmail = `mentor_pin_${timestamp}@example.com`;
  const studentEmail = `student_pin_${timestamp}@example.com`;
  const outsiderEmail = `outsider_pin_${timestamp}@example.com`;
  const defaultPassword = 'PinTestPass123!';

  let httpServer = null;
  let serverPort = null;
  let serverAddress = null;

  let mentorUser = null;
  let mentorToken = null;
  let studentUser = null;
  let studentToken = null;
  let outsiderUser = null;
  let outsiderToken = null;

  let conversationA = null;
  let conversationB = null;

  let mentorSocket = null;
  let studentSocket = null;

  let message1Id = null;
  let message2Id = null;
  let deletedMessageId = null;
  let convBMessageId = null;

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

    // Mentor
    mentorUser = await User.create({
      name: 'Mentor Ada Lovelace',
      email: mentorEmail,
      passwordHash,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
      profile: {
        mentorDetails: { organization: 'Analytical Engine Lab', designation: 'Principal Architect' },
      },
    });
    mentorToken = signToken({
      id: mentorUser._id.toString(),
      role: ROLES.MENTOR,
      email: mentorEmail,
    });

    // Student
    studentUser = await User.create({
      name: 'Student Charles Babbage',
      email: studentEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { studentId: `STU-PIN-${timestamp}`, department: 'Computing' },
      },
    });
    studentToken = signToken({
      id: studentUser._id.toString(),
      role: ROLES.STUDENT,
      email: studentEmail,
    });

    // Outsider User
    outsiderUser = await User.create({
      name: 'Student Alan Turing',
      email: outsiderEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { studentId: `STU-OUT-${timestamp}`, department: 'Logic' },
      },
    });
    outsiderToken = signToken({
      id: outsiderUser._id.toString(),
      role: ROLES.STUDENT,
      email: outsiderEmail,
    });

    // Conversation A: Mentor + Student
    conversationA = await Conversation.create({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [mentorUser._id, studentUser._id],
      readReceipts: [
        { user: mentorUser._id, lastReadAt: new Date() },
        { user: studentUser._id, lastReadAt: new Date() },
      ],
      lastMessageAt: new Date(),
    });

    // Conversation B: Mentor + Outsider
    conversationB = await Conversation.create({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [mentorUser._id, outsiderUser._id],
      readReceipts: [
        { user: mentorUser._id, lastReadAt: new Date() },
        { user: outsiderUser._id, lastReadAt: new Date() },
      ],
      lastMessageAt: new Date(),
    });

    // Seed Messages in Conversation A
    const msg1 = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'Important: Milestone 3 guidelines have been published. Review carefully.',
      createdAt: new Date(Date.now() - 3600000 * 5),
    });
    message1Id = msg1._id.toString();

    const msg2 = await Message.create({
      conversation: conversationA._id,
      sender: studentUser._id,
      content: 'Understood mentor, I have drafted the testing matrix for review.',
      attachments: [
        {
          url: '/api/chat/attachments/test_matrix.pdf',
          fileName: 'test_matrix.pdf',
          fileType: ATTACHMENT_TYPES.PDF,
          mimeType: 'application/pdf',
          size: 51200,
          fileKey: 'test_matrix.pdf',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 3),
    });
    message2Id = msg2._id.toString();

    const delMsg = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'This message was deleted',
      isDeleted: true,
      createdAt: new Date(Date.now() - 3600000 * 2),
    });
    deletedMessageId = delMsg._id.toString();

    // Message in Conversation B
    const msgB = await Message.create({
      conversation: conversationB._id,
      sender: mentorUser._id,
      content: 'Cross conversation reference message in Conv B.',
      createdAt: new Date(Date.now() - 3600000),
    });
    convBMessageId = msgB._id.toString();

    // Initialize Socket.IO clients
    mentorSocket = Client(serverAddress, {
      auth: { token: mentorToken },
      transports: ['websocket'],
    });

    studentSocket = Client(serverAddress, {
      auth: { token: studentToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Mentor socket timeout')), 5000);
        mentorSocket.on('connect', () => {
          mentorSocket.emit('conversation:join', { conversationId: conversationA._id.toString() });
          clearTimeout(timeout);
          resolve();
        });
        mentorSocket.on('connect_error', reject);
      }),
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Student socket timeout')), 5000);
        studentSocket.on('connect', () => {
          studentSocket.emit('conversation:join', { conversationId: conversationA._id.toString() });
          clearTimeout(timeout);
          resolve();
        });
        studentSocket.on('connect_error', reject);
      }),
    ]);
  });

  after(async () => {
    if (mentorSocket?.connected) mentorSocket.disconnect();
    if (studentSocket?.connected) studentSocket.disconnect();

    const io = getIO();
    if (io) {
      await new Promise((resolve) => io.close(resolve));
    }
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }

    if (conversationA) {
      await Message.deleteMany({ conversation: conversationA._id });
      await Conversation.findByIdAndDelete(conversationA._id);
    }
    if (conversationB) {
      await Message.deleteMany({ conversation: conversationB._id });
      await Conversation.findByIdAndDelete(conversationB._id);
    }
    if (mentorUser) await User.findByIdAndDelete(mentorUser._id);
    if (studentUser) await User.findByIdAndDelete(studentUser._id);
    if (outsiderUser) await User.findByIdAndDelete(outsiderUser._id);

    await mongoose.connection.close();
  });

  // TC-PIN-01: Pin a message via PATCH /conversations/:id/pin
  it('TC-PIN-01: Student pins mentor message in conversation (PATCH /conversations/:id/pin)', async () => {
    const res = await request(app)
      .patch(`/api/chat/conversations/${conversationA._id}/pin`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ messageId: message1Id });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Message pinned successfully.');

    const conv = res.body.data.conversation;
    assert.ok(conv.pinnedMessage);
    assert.equal(conv.pinnedMessage.message._id.toString(), message1Id);
    assert.equal(conv.pinnedMessage.pinnedBy._id.toString(), studentUser._id.toString());
    assert.ok(conv.pinnedMessage.pinnedAt);
    assert.equal(conv.pinnedMessage.message.content, 'Important: Milestone 3 guidelines have been published. Review carefully.');
  });

  // TC-PIN-02: Real-time Socket.IO emission delivers pin update
  it('TC-PIN-02: Real-time Socket.IO event received by peer when message is pinned', async () => {
    const pinPromise = new Promise((resolve) => {
      mentorSocket.once('chat:message_pinned', (payload) => {
        resolve(payload);
      });
    });

    const res = await request(app)
      .patch(`/api/chat/conversations/${conversationA._id}/pin`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ messageId: message2Id });

    assert.equal(res.status, 200);

    const socketPayload = await pinPromise;
    assert.equal(socketPayload.conversationId.toString(), conversationA._id.toString());
    assert.ok(socketPayload.pinnedMessage);
    assert.equal(socketPayload.pinnedMessage.message._id.toString(), message2Id);
    assert.equal(socketPayload.pinnedMessage.pinnedBy._id.toString(), studentUser._id.toString());
    assert.equal(socketPayload.pinnedMessage.message.attachments[0].fileName, 'test_matrix.pdf');
  });

  // TC-PIN-03: Replacing an existing pin (1 pinned message per conversation rule)
  it('TC-PIN-03: Pinning a new message replaces the previous pin', async () => {
    // Current pinned message is message2Id. Now mentor pins message1Id again.
    const res = await request(app)
      .patch(`/api/chat/conversations/${conversationA._id}/pin`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ messageId: message1Id });

    assert.equal(res.status, 200);
    const conv = res.body.data.conversation;
    assert.equal(conv.pinnedMessage.message._id.toString(), message1Id);
    assert.equal(conv.pinnedMessage.pinnedBy._id.toString(), mentorUser._id.toString());

    // Verify DB state directly
    const dbConv = await Conversation.findById(conversationA._id);
    assert.equal(dbConv.pinnedMessage.message.toString(), message1Id);
    assert.equal(dbConv.pinnedMessage.pinnedBy.toString(), mentorUser._id.toString());
  });

  // TC-PIN-04: Unpin the currently pinned message
  it('TC-PIN-04: Authorized user unpins currently pinned message', async () => {
    const unpinPromise = new Promise((resolve) => {
      studentSocket.once('chat:message_unpinned', (payload) => {
        resolve(payload);
      });
    });

    const res = await request(app)
      .patch(`/api/chat/conversations/${conversationA._id}/unpin`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ messageId: message1Id });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.unpinnedMessageId, message1Id);

    const socketPayload = await unpinPromise;
    assert.equal(socketPayload.conversationId.toString(), conversationA._id.toString());
    assert.equal(socketPayload.messageId.toString(), message1Id);

    // Verify DB has cleared pinnedMessage
    const dbConv = await Conversation.findById(conversationA._id);
    assert.equal(dbConv.pinnedMessage, null);
  });

  // TC-PIN-05: Unpinning when nothing is pinned returns 400
  it('TC-PIN-05: Unpinning when no message is pinned returns 400 Bad Request', async () => {
    const res = await request(app)
      .patch(`/api/chat/conversations/${conversationA._id}/unpin`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /no message is currently pinned/i);
  });

  // TC-PIN-06: Security - Reject cross-conversation pinning
  it('TC-PIN-06: Rejects pinning a message from another conversation (400 Bad Request)', async () => {
    const res = await request(app)
      .patch(`/api/chat/conversations/${conversationA._id}/pin`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ messageId: convBMessageId });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /different conversation/i);
  });

  // TC-PIN-07: Security - Reject pinning a soft-deleted message
  it('TC-PIN-07: Rejects pinning a deleted message (400 Bad Request)', async () => {
    const res = await request(app)
      .patch(`/api/chat/conversations/${conversationA._id}/pin`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ messageId: deletedMessageId });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /deleted messages cannot be pinned/i);
  });

  // TC-PIN-08: Security - Reject unauthorized user not in conversation
  it('TC-PIN-08: Rejects pinning attempt from a user who is not a conversation participant (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/chat/conversations/${conversationA._id}/pin`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ messageId: message1Id });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    const errText = res.body.error?.message || res.body.message;
    assert.match(errText, /access denied/i);
  });

  // TC-PIN-09: Cascade on Message Delete - Automatically clears pin
  it('TC-PIN-09: Deleting a pinned message for everyone automatically clears pin and emits unpin event', async () => {
    // 1. First create and pin a temporary message
    const tempMsg = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'Temporary announcement to be pinned and then deleted.',
      createdAt: new Date(),
    });

    await request(app)
      .patch(`/api/chat/conversations/${conversationA._id}/pin`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ messageId: tempMsg._id.toString() });

    // Verify pinned
    let checkConv = await Conversation.findById(conversationA._id);
    assert.equal(checkConv.pinnedMessage?.message?.toString(), tempMsg._id.toString());

    // 2. Setup listener for unpin broadcast
    const unpinPromise = new Promise((resolve) => {
      studentSocket.once('chat:message_unpinned', (payload) => {
        resolve(payload);
      });
    });

    // 3. Delete message for everyone
    const delRes = await request(app)
      .delete(`/api/chat/messages/${tempMsg._id}`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ mode: 'everyone' });

    assert.equal(delRes.status, 200);

    const socketPayload = await unpinPromise;
    assert.equal(socketPayload.conversationId.toString(), conversationA._id.toString());
    assert.equal(socketPayload.messageId.toString(), tempMsg._id.toString());
    assert.equal(socketPayload.reason, 'deleted');

    // 4. Verify DB state cleared
    checkConv = await Conversation.findById(conversationA._id);
    assert.equal(checkConv.pinnedMessage, null);
  });

  // TC-PIN-10: Synchronization on Message Edit
  it('TC-PIN-10: Editing a pinned message updates its preview and broadcasts updated pinned data', async () => {
    // Pin message1Id
    await request(app)
      .patch(`/api/chat/conversations/${conversationA._id}/pin`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ messageId: message1Id });

    const pinUpdatePromise = new Promise((resolve) => {
      studentSocket.once('chat:message_pinned', (payload) => {
        resolve(payload);
      });
    });

    // Mentor edits message1Id
    const editRes = await request(app)
      .patch(`/api/chat/messages/${message1Id}`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({ content: 'Important: Milestone 3 guidelines have been revised to v3.2. Please check.' });

    assert.equal(editRes.status, 200);

    const socketPayload = await pinUpdatePromise;
    assert.equal(socketPayload.conversationId.toString(), conversationA._id.toString());
    assert.ok(socketPayload.pinnedMessage);
    assert.match(socketPayload.pinnedMessage.message.content, /revised to v3.2/i);
  });

  // TC-PIN-11: Conversation retrieval preserves populated pinnedMessage
  it('TC-PIN-11: GET /conversations and GET /conversations/:id include populated pinnedMessage', async () => {
    const listRes = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(listRes.status, 200);
    const targetConv = listRes.body.data.conversations.find((c) => c._id.toString() === conversationA._id.toString());
    assert.ok(targetConv);
    assert.ok(targetConv.pinnedMessage);
    assert.equal(targetConv.pinnedMessage.message._id.toString(), message1Id);
    assert.equal(targetConv.pinnedMessage.pinnedBy._id.toString(), studentUser._id.toString());

    // Single conversation fetch
    const singleRes = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(singleRes.status, 200);
    assert.ok(singleRes.body.data.conversation.pinnedMessage);
    assert.equal(singleRes.body.data.conversation.pinnedMessage.message._id.toString(), message1Id);
  });

  // TC-PIN-12: Dual endpoint test - PATCH /messages/:messageId/pin
  it('TC-PIN-12: Supports message-level endpoint PATCH /messages/:messageId/pin', async () => {
    const res = await request(app)
      .patch(`/api/chat/messages/${message2Id}/pin`)
      .set('Authorization', `Bearer ${mentorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.pinnedMessage.message._id.toString(), message2Id);
  });
});
