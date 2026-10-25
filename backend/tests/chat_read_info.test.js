import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { initSocket } from '../src/socket.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Conversation, CONVERSATION_TYPES } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Feature: Message Info & Read By Receipts Tests', () => {
  const timestamp = Date.now();
  const userAEmail = `user_a_${timestamp}@example.com`;
  const userBEmail = `user_b_${timestamp}@example.com`;
  const userCEmail = `user_c_${timestamp}@example.com`;
  const outsiderEmail = `outsider_${timestamp}@example.com`;
  const defaultPassword = 'Pass123!Secure';

  let httpServer = null;
  let userA = null;
  let tokenA = null;
  let userB = null;
  let tokenB = null;
  let userC = null;
  let tokenC = null;
  let outsider = null;
  let tokenOutsider = null;

  let groupConv = null;
  let groupMsgId = null;

  before(async () => {
    await connectDB();

    httpServer = http.createServer(app);
    initSocket(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(0, resolve);
    });

    const passwordHash = await hashPassword(defaultPassword);

    userA = await User.create({
      name: 'Alice Group Sender',
      email: userAEmail,
      passwordHash,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
    });
    tokenA = signToken({ id: userA._id, role: userA.role, email: userA.email });

    userB = await User.create({
      name: 'Bob Group Reader',
      email: userBEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
    });
    tokenB = signToken({ id: userB._id, role: userB.role, email: userB.email });

    userC = await User.create({
      name: 'Charlie Unread',
      email: userCEmail,
      passwordHash,
      role: ROLES.COORDINATOR,
      status: USER_STATUSES.ACTIVE,
    });
    tokenC = signToken({ id: userC._id, role: userC.role, email: userC.email });

    outsider = await User.create({
      name: 'Dave Outsider',
      email: outsiderEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
    });
    tokenOutsider = signToken({ id: outsider._id, role: outsider.role, email: outsider.email });

    // Create group conversation with User A, User B, and User C
    groupConv = await Conversation.create({
      type: CONVERSATION_TYPES.GROUP,
      name: 'Internship Core Team',
      participants: [userA._id, userB._id, userC._id],
      creator: userA._id,
      groupAdmins: [userA._id],
      readReceipts: [
        { user: userA._id, lastReadAt: new Date() },
        { user: userB._id, lastReadAt: new Date(0) },
        { user: userC._id, lastReadAt: new Date(0) },
      ],
    });

    // User A posts a message in group
    const msg = await Message.create({
      conversation: groupConv._id,
      sender: userA._id,
      content: 'Important group announcement regarding evaluation submissions.',
      status: 'sent',
      readBy: [userA._id],
    });
    groupMsgId = msg._id.toString();

    // User B reads the conversation
    const markRes = await request(app)
      .patch(`/api/chat/conversations/${groupConv._id}/read`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(markRes.status, 200);
  });

  after(async () => {
    if (groupConv) {
      await Message.deleteMany({ conversation: groupConv._id });
      await Conversation.deleteOne({ _id: groupConv._id });
    }
    await User.deleteMany({
      email: { $in: [userAEmail, userBEmail, userCEmail, outsiderEmail] },
    });

    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('TC-01: Retrieves seen-by list in group chat (Bob read, Charlie unread)', async () => {
    const res = await request(app)
      .get(`/api/chat/messages/${groupMsgId}/read-info`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);

    const { readBy, deliveredTo, totalParticipants } = res.body.data;
    assert.equal(totalParticipants, 2); // Bob and Charlie (excluding Alice the sender)

    // Bob should be in readBy
    assert.equal(readBy.length, 1);
    assert.equal(readBy[0].user.name, 'Bob Group Reader');
    assert.equal(readBy[0].user.role, ROLES.STUDENT);
    assert.ok(readBy[0].readAt);

    // Charlie should be in deliveredTo (not yet seen)
    assert.equal(deliveredTo.length, 1);
    assert.equal(deliveredTo[0].user.name, 'Charlie Unread');
    assert.equal(deliveredTo[0].user.role, ROLES.COORDINATOR);
  });

  it('TC-02: User C reads the message -> moves from deliveredTo to readBy', async () => {
    // User C marks conversation as read
    const markRes = await request(app)
      .patch(`/api/chat/conversations/${groupConv._id}/read`)
      .set('Authorization', `Bearer ${tokenC}`);
    assert.equal(markRes.status, 200);

    // Check read-info again
    const res = await request(app)
      .get(`/api/chat/messages/${groupMsgId}/read-info`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    const { readBy, deliveredTo } = res.body.data;

    // Both Bob and Charlie should now be in readBy
    assert.equal(readBy.length, 2);
    const readerNames = readBy.map((r) => r.user.name);
    assert.ok(readerNames.includes('Bob Group Reader'));
    assert.ok(readerNames.includes('Charlie Unread'));

    // deliveredTo should be empty (all have read)
    assert.equal(deliveredTo.length, 0);
  });

  it('TC-03: Access control - 403 Forbidden for non-member', async () => {
    const res = await request(app)
      .get(`/api/chat/messages/${groupMsgId}/read-info`)
      .set('Authorization', `Bearer ${tokenOutsider}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('TC-04: Invalid message ID returns 400 Bad Request', async () => {
    const res = await request(app)
      .get('/api/chat/messages/invalid-id-123/read-info')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });
});
