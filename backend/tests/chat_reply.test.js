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

describe('Feature: Reply to a Specific Message Tests', () => {
  const timestamp = Date.now();
  const mentorEmail = `mentor_reply_${timestamp}@example.com`;
  const studentEmail = `student_reply_${timestamp}@example.com`;
  const otherStudentEmail = `other_reply_${timestamp}@example.com`;
  const defaultPassword = 'ReplyTestPass123!';

  let httpServer = null;
  let serverPort = null;
  let serverAddress = null;

  let mentorUser = null;
  let mentorToken = null;
  let studentUser = null;
  let studentToken = null;
  let otherStudentUser = null;
  let otherStudentToken = null;

  let conversationA = null;
  let conversationB = null;

  let studentSocket = null;

  let textMessageId = null;
  let imageMessageId = null;
  let docMessageId = null;
  let editedMessageId = null;
  let deletedMessageId = null;
  let deletedForStudentMessageId = null;

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
      name: 'Mentor Margaret Hamilton',
      email: mentorEmail,
      passwordHash,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
      profile: {
        mentorDetails: { organization: 'Apollo Systems', designation: 'Lead Engineer' },
      },
    });
    mentorToken = signToken({
      id: mentorUser._id.toString(),
      role: ROLES.MENTOR,
      email: mentorEmail,
    });

    // Student
    studentUser = await User.create({
      name: 'Student Neil Armstrong',
      email: studentEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { studentId: `STU-RPL-${timestamp}`, department: 'Aerospace' },
      },
    });
    studentToken = signToken({
      id: studentUser._id.toString(),
      role: ROLES.STUDENT,
      email: studentEmail,
    });

    // Other Student (in conversation B)
    otherStudentUser = await User.create({
      name: 'Student Buzz Aldrin',
      email: otherStudentEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { studentId: `STU-OTH-${timestamp}`, department: 'Aerospace' },
      },
    });
    otherStudentToken = signToken({
      id: otherStudentUser._id.toString(),
      role: ROLES.STUDENT,
      email: otherStudentEmail,
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

    // Conversation B: Student + Other Student (for cross-conversation tests)
    conversationB = await Conversation.create({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [studentUser._id, otherStudentUser._id],
      readReceipts: [
        { user: studentUser._id, lastReadAt: new Date() },
        { user: otherStudentUser._id, lastReadAt: new Date() },
      ],
      lastMessageAt: new Date(),
    });

    // Seed original messages in Conversation A:
    // 1. Text Message
    const textMsg = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'Please submit your lunar navigation report by Friday.',
      createdAt: new Date(Date.now() - 3600000 * 5),
    });
    textMessageId = textMsg._id.toString();

    // 2. Image Attachment Message
    const imgMsg = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'Telemetry diagram attached below.',
      attachments: [
        {
          url: '/api/chat/attachments/telemetry_diagram.png',
          fileName: 'telemetry_diagram.png',
          fileType: ATTACHMENT_TYPES.IMAGE,
          mimeType: 'image/png',
          size: 102400,
          fileKey: 'telemetry_diagram.png',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 4),
    });
    imageMessageId = imgMsg._id.toString();

    // 3. Document Attachment Message (Resume/Offer Letter/Report)
    const docMsg = await Message.create({
      conversation: conversationA._id,
      sender: studentUser._id,
      content: 'Here is my updated Milestone_2_Report.pdf for review.',
      attachments: [
        {
          url: '/api/chat/attachments/Milestone_2_Report.pdf',
          fileName: 'Milestone_2_Report.pdf',
          fileType: ATTACHMENT_TYPES.PDF,
          mimeType: 'application/pdf',
          size: 204800,
          fileKey: 'Milestone_2_Report.pdf',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 3),
    });
    docMessageId = docMsg._id.toString();

    // 4. Edited Message
    const editMsg = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'Initial text',
      createdAt: new Date(Date.now() - 3600000 * 2),
    });
    editMsg.content = 'Updated meeting time: 4:00 PM EST in the briefing room.';
    editMsg.isEdited = true;
    editMsg.editedAt = new Date();
    await editMsg.save();
    editedMessageId = editMsg._id.toString();

    // 5. Soft-deleted Message (deleted for everyone)
    const delMsg = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'This message was deleted',
      isDeleted: true,
      createdAt: new Date(Date.now() - 3600000),
    });
    deletedMessageId = delMsg._id.toString();

    // 6. Message deleted for student only
    const delForStudentMsg = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'Private note hidden from student',
      deletedFor: [studentUser._id],
      createdAt: new Date(Date.now() - 1800000),
    });
    deletedForStudentMessageId = delForStudentMsg._id.toString();

    // Initialize Student Socket client for real-time listener test
    studentSocket = Client(serverAddress, {
      auth: { token: studentToken },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Student socket timeout')), 5000);
      studentSocket.on('connect', () => {
        studentSocket.emit('conversation:join', { conversationId: conversationA._id.toString() });
        clearTimeout(timeout);
        resolve();
      });
      studentSocket.on('connect_error', reject);
    });
  });

  after(async () => {
    if (studentSocket?.connected) {
      studentSocket.disconnect();
    }
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
    if (otherStudentUser) await User.findByIdAndDelete(otherStudentUser._id);

    await mongoose.connection.close();
  });

  // TC-REPLY-01: Reply to a text message
  it('TC-REPLY-01: Student replies to a mentor text message with server-verified snapshot', async () => {
    const res = await request(app)
      .post(`/api/chat/conversations/${conversationA._id}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: 'Understood. I will complete the report by Thursday evening.',
        replyTo: textMessageId,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const msg = res.body.data.message;

    // Verify reply reference and replyToMessageId
    assert.equal(msg.replyTo._id.toString(), textMessageId);
    assert.equal(msg.replyToMessageId.toString(), textMessageId);

    // Verify replySnapshot contains server-validated metadata
    assert.ok(msg.replySnapshot);
    assert.equal(msg.replySnapshot.senderName, 'Mentor Margaret Hamilton');
    assert.equal(msg.replySnapshot.senderRole, 'mentor');
    assert.equal(msg.replySnapshot.contentPreview, 'Please submit your lunar navigation report by Friday.');
    assert.equal(msg.replySnapshot.hasAttachments, false);
    assert.equal(msg.replySnapshot.isDeleted, false);

    // Verify sender of the reply is the authenticated student
    assert.equal(msg.sender._id.toString(), studentUser._id.toString());
  });

  // TC-REPLY-02: Reply to an image attachment message
  it('TC-REPLY-02: Reply to an image attachment message captures attachment summary', async () => {
    const res = await request(app)
      .post(`/api/chat/conversations/${conversationA._id}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: 'The telemetry values look consistent with stage 1 calibration.',
        replyTo: imageMessageId,
      });

    assert.equal(res.status, 201);
    const msg = res.body.data.message;

    assert.ok(msg.replySnapshot);
    assert.equal(msg.replySnapshot.hasAttachments, true);
    assert.equal(msg.replySnapshot.attachmentSummary, 'telemetry_diagram.png');
    assert.equal(msg.replySnapshot.contentPreview, 'Telemetry diagram attached below.');
  });

  // TC-REPLY-03: Reply to a document attachment message (Report/Resume)
  it('TC-REPLY-03: Mentor replies to student document submission', async () => {
    const res = await request(app)
      .post(`/api/chat/conversations/${conversationA._id}/messages`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        content: 'Received Milestone 2 report. Excellent formatting and test documentation.',
        replyTo: docMessageId,
      });

    assert.equal(res.status, 201);
    const msg = res.body.data.message;

    assert.equal(msg.replySnapshot.senderName, 'Student Neil Armstrong');
    assert.equal(msg.replySnapshot.senderRole, 'student');
    assert.equal(msg.replySnapshot.hasAttachments, true);
    assert.equal(msg.replySnapshot.attachmentSummary, 'Milestone_2_Report.pdf');
  });

  // TC-REPLY-04: Real-time Socket.IO emission delivers reply context
  it('TC-REPLY-04: Mentor sends reply; student receives reply context in real time via Socket.IO', async () => {
    const replyPromise = new Promise((resolve) => {
      studentSocket.once('chat:message', (payload) => {
        resolve(payload);
      });
    });

    const res = await request(app)
      .post(`/api/chat/conversations/${conversationA._id}/messages`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        content: 'Real-time check on telemetry reply.',
        replyTo: textMessageId,
      });

    assert.equal(res.status, 201);

    const socketPayload = await replyPromise;
    assert.equal(socketPayload.conversationId.toString(), conversationA._id.toString());
    assert.ok(socketPayload.message.replyTo);
    assert.equal(socketPayload.message.replyTo._id.toString(), textMessageId);
    assert.equal(socketPayload.message.replySnapshot.senderName, 'Mentor Margaret Hamilton');
  });

  // TC-REPLY-05: Security - Prevent cross-conversation reply references
  it('TC-REPLY-05: Rejects reply pointing to a message from a different conversation (400 Bad Request)', async () => {
    // Attempt to reply in Conversation B referencing textMessageId from Conversation A
    const res = await request(app)
      .post(`/api/chat/conversations/${conversationB._id}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: 'Cross conversation attempt should be rejected.',
        replyTo: textMessageId,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /different conversation/i);
  });

  // TC-REPLY-06: Non-existent or invalid replyTo ID
  it('TC-REPLY-06: Non-existent ID returns 404, invalid format returns 400', async () => {
    // Invalid ID format
    const resInvalid = await request(app)
      .post(`/api/chat/conversations/${conversationA._id}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: 'Invalid ID test',
        replyTo: 'invalid-id-xyz',
      });
    assert.equal(resInvalid.status, 400);

    // Non-existent ID (valid ObjectId format)
    const fakeId = new mongoose.Types.ObjectId();
    const resNotFound = await request(app)
      .post(`/api/chat/conversations/${conversationA._id}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: 'Non-existent ID test',
        replyTo: fakeId,
      });
    assert.equal(resNotFound.status, 404);
  });

  // TC-REPLY-07: Reply to edited original message captures latest content
  it('TC-REPLY-07: Replying to edited original reflects latest edited content in snapshot', async () => {
    const res = await request(app)
      .post(`/api/chat/conversations/${conversationA._id}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: 'I will be at the briefing room at 4:00 PM.',
        replyTo: editedMessageId,
      });

    assert.equal(res.status, 201);
    const msg = res.body.data.message;
    assert.ok(msg.replySnapshot.contentPreview.includes('4:00 PM EST'));
  });

  // TC-REPLY-08: Reply to soft-deleted original message handled gracefully
  it('TC-REPLY-08: Reply to soft-deleted message handles deleted original safely', async () => {
    const res = await request(app)
      .post(`/api/chat/conversations/${conversationA._id}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: 'I noticed the previous message was deleted.',
        replyTo: deletedMessageId,
      });

    assert.equal(res.status, 201);
    const msg = res.body.data.message;
    assert.equal(msg.replySnapshot.isDeleted, true);
    assert.equal(msg.replySnapshot.contentPreview, 'This message was deleted');
  });

  // TC-REPLY-09: Replying to message deleted specifically for current user is rejected
  it('TC-REPLY-09: Replying to a message deleted specifically for current user returns 404', async () => {
    const res = await request(app)
      .post(`/api/chat/conversations/${conversationA._id}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: 'Attempting to reply to a message deleted for me',
        replyTo: deletedForStudentMessageId,
      });

    assert.equal(res.status, 404);
  });

  // TC-REPLY-10: Jump to quoted message using aroundMessageId
  it('TC-REPLY-10: Jumping to quoted parent message returns chronological context window', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages?aroundMessageId=${textMessageId}&limit=10`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const found = res.body.data.messages.some((m) => m._id.toString() === textMessageId);
    assert.ok(found, 'Original parent message must be in the returned window');
  });
});
