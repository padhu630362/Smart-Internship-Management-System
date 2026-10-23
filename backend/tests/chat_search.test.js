import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Conversation, CONVERSATION_TYPES } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Feature: In-Chat Message Search & Context Jump Tests', () => {
  const timestamp = Date.now();
  const mentorEmail = `mentor_search_${timestamp}@example.com`;
  const studentEmail = `student_search_${timestamp}@example.com`;
  const outsiderEmail = `outsider_search_${timestamp}@example.com`;
  const defaultPassword = 'SearchTestPass123!';

  let mentorUser = null;
  let mentorToken = null;
  let studentUser = null;
  let studentToken = null;
  let outsiderUser = null;
  let outsiderToken = null;

  let conversationA = null;
  let conversationB = null;

  let targetOldMessageId = null;
  let deletedEveryoneMessageId = null;
  let deletedForMeMessageId = null;

  before(async () => {
    await connectDB();

    const passwordHash = await hashPassword(defaultPassword);

    // Create Mentor
    mentorUser = await User.create({
      name: 'Mentor Ada Lovelace',
      email: mentorEmail,
      passwordHash,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
      profile: {
        mentorDetails: { organization: 'TechCorp', designation: 'Senior Architect' },
      },
    });
    mentorToken = signToken({
      id: mentorUser._id.toString(),
      role: ROLES.MENTOR,
      email: mentorEmail,
    });

    // Create Student
    studentUser = await User.create({
      name: 'Student Alan Turing',
      email: studentEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { studentId: `STU-SRCH-${timestamp}`, department: 'CS' },
      },
    });
    studentToken = signToken({
      id: studentUser._id.toString(),
      role: ROLES.STUDENT,
      email: studentEmail,
    });

    // Create Outsider (Unauthorized User)
    outsiderUser = await User.create({
      name: 'Outsider User',
      email: outsiderEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { studentId: `STU-OUT-${timestamp}`, department: 'Math' },
      },
    });
    outsiderToken = signToken({
      id: outsiderUser._id.toString(),
      role: ROLES.STUDENT,
      email: outsiderEmail,
    });

    // Create Conversation A (Mentor + Student)
    conversationA = await Conversation.create({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [mentorUser._id, studentUser._id],
      readReceipts: [
        { user: mentorUser._id, lastReadAt: new Date() },
        { user: studentUser._id, lastReadAt: new Date() },
      ],
      lastMessageAt: new Date(),
    });

    // Create Conversation B (Student + Outsider) - for isolation tests
    conversationB = await Conversation.create({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [studentUser._id, outsiderUser._id],
      readReceipts: [
        { user: studentUser._id, lastReadAt: new Date() },
        { user: outsiderUser._id, lastReadAt: new Date() },
      ],
      lastMessageAt: new Date(),
    });

    // Seed messages in Conversation A
    // 1. Initial greeting
    await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'Welcome to the SIMS Internship Program, Alan!',
      createdAt: new Date(Date.now() - 3600000 * 24),
    });

    // 2. Specific mixed-case keyword message
    const targetMsg = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'Here is the Architecture Blueprint for Quantum Computing simulation.',
      createdAt: new Date(Date.now() - 3600000 * 20),
    });
    targetOldMessageId = targetMsg._id.toString();

    // 3. Paginated milestone messages (15 messages)
    for (let i = 1; i <= 15; i++) {
      await Message.create({
        conversation: conversationA._id,
        sender: i % 2 === 0 ? mentorUser._id : studentUser._id,
        content: `Weekly Progress Review Milestone-${i}: Completed task deliverables and unit tests.`,
        createdAt: new Date(Date.now() - 3600000 * (18 - i)),
      });
    }

    // 4. Soft-deleted message (deleted for everyone)
    const delMsg = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'Confidential Internal Review Note [SUPER_SECRET_KEYWORD]',
      isDeleted: true,
      createdAt: new Date(Date.now() - 3600000 * 2),
    });
    deletedEveryoneMessageId = delMsg._id.toString();

    // 5. Message deleted for student only
    const delForMeMsg = await Message.create({
      conversation: conversationA._id,
      sender: mentorUser._id,
      content: 'Private reminder note [PERSONAL_REMINDER_KEYWORD]',
      deletedFor: [studentUser._id],
      createdAt: new Date(Date.now() - 3600000),
    });
    deletedForMeMessageId = delForMeMsg._id.toString();

    // Seed message in Conversation B with identical keyword for isolation test
    await Message.create({
      conversation: conversationB._id,
      sender: outsiderUser._id,
      content: 'Conversation B discusses the Quantum Computing isolation test.',
      createdAt: new Date(),
    });
  });

  after(async () => {
    // Cleanup seeded test documents
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

  // TC-CHAT-SEARCH-01: Case-insensitive search finds matching messages
  it('TC-CHAT-SEARCH-01: Case-insensitive search finds matching messages', async () => {
    const queries = ['blueprint', 'BLUEPRINT', 'BluePrint', 'quantum computing'];

    for (const q of queries) {
      const res = await request(app)
        .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=${encodeURIComponent(q)}`)
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.messages.length >= 1);
      assert.ok(
        res.body.data.messages.some((m) =>
          m.content.toLowerCase().includes('architecture blueprint')
        )
      );
      assert.equal(res.body.data.query, q);
    }
  });

  // TC-CHAT-SEARCH-02: Search across older persisted messages
  it('TC-CHAT-SEARCH-02: Search across older persisted messages', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=Welcome%20to%20the%20SIMS`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.messages.length, 1);
    assert.equal(res.body.data.messages[0].sender.name, 'Mentor Ada Lovelace');
    assert.equal(res.body.data.messages[0].sender.role, 'mentor');
  });

  // TC-CHAT-SEARCH-03: Empty and invalid queries are rejected with 400 Bad Request
  it('TC-CHAT-SEARCH-03: Empty, whitespace-only, and oversized queries rejected with 400', async () => {
    // Missing query
    const res1 = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(res1.status, 400);
    assert.equal(res1.body.success, false);

    // Whitespace only
    const res2 = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=%20%20%20`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(res2.status, 400);
    assert.equal(res2.body.success, false);

    // Oversized query (> 100 characters)
    const longQuery = 'a'.repeat(101);
    const res3 = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=${longQuery}`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(res3.status, 400);
    assert.equal(res3.body.success, false);
  });

  // TC-CHAT-SEARCH-04: Regex special characters handled safely without error or ReDoS
  it('TC-CHAT-SEARCH-04: Regex special characters handled safely without error or ReDoS', async () => {
    const specialChars = ['[SUPER_SECRET]', '.*', '(hello)', '+', '?', '^', '$', '\\', '{1,3}'];

    for (const charQuery of specialChars) {
      const res = await request(app)
        .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=${encodeURIComponent(charQuery)}`)
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 200, `Query "${charQuery}" should return 200 OK`);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.messages));
    }
  });

  // TC-CHAT-SEARCH-05: Pagination through search results
  it('TC-CHAT-SEARCH-05: Pagination through search results', async () => {
    // Page 1 with limit 5
    const resP1 = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=Weekly%20Progress%20Review&page=1&limit=5`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resP1.status, 200);
    assert.equal(resP1.body.data.messages.length, 5);
    assert.equal(resP1.body.data.pagination.page, 1);
    assert.equal(resP1.body.data.pagination.limit, 5);
    assert.equal(resP1.body.data.pagination.total, 15);
    assert.equal(resP1.body.data.pagination.totalPages, 3);
    assert.equal(resP1.body.data.pagination.hasMore, true);

    // Page 2 with limit 5
    const resP2 = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=Weekly%20Progress%20Review&page=2&limit=5`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resP2.status, 200);
    assert.equal(resP2.body.data.messages.length, 5);
    assert.equal(resP2.body.data.pagination.page, 2);
    assert.equal(resP2.body.data.pagination.hasMore, true);

    // Ensure page 1 and page 2 message IDs do not overlap
    const p1Ids = new Set(resP1.body.data.messages.map((m) => m._id));
    for (const msg of resP2.body.data.messages) {
      assert.equal(p1Ids.has(msg._id), false, 'Page 2 IDs should not overlap with Page 1');
    }

    // Page 3 with limit 5
    const resP3 = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=Weekly%20Progress%20Review&page=3&limit=5`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resP3.status, 200);
    assert.equal(resP3.body.data.messages.length, 5);
    assert.equal(resP3.body.data.pagination.page, 3);
    assert.equal(resP3.body.data.pagination.hasMore, false);
  });

  // TC-CHAT-SEARCH-06: Unauthorized user cannot search conversation
  it('TC-CHAT-SEARCH-06: Unauthorized user cannot search conversation (403 Forbidden)', async () => {
    // Outsider user is not a participant in conversationA
    const res = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=Blueprint`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);

    // No authorization token -> 401
    const resUnauth = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=Blueprint`);

    assert.equal(resUnauth.status, 401);
  });

  // TC-CHAT-SEARCH-07: Search isolation between conversations
  it('TC-CHAT-SEARCH-07: Search strictly isolates results to the specified conversation', async () => {
    // Search conversationA for 'Quantum Computing' -> only returns message from conversationA
    const resA = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=Quantum%20Computing`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resA.status, 200);
    assert.equal(resA.body.data.messages.length, 1);
    assert.equal(resA.body.data.messages[0]._id.toString(), targetOldMessageId);
    assert.equal(resA.body.data.messages[0].conversation.toString(), conversationA._id.toString());

    // Search conversationB for 'Quantum Computing' -> only returns message from conversationB
    const resB = await request(app)
      .get(`/api/chat/conversations/${conversationB._id}/messages/search?q=Quantum%20Computing`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resB.status, 200);
    assert.equal(resB.body.data.messages.length, 1);
    assert.notEqual(resB.body.data.messages[0]._id.toString(), targetOldMessageId);
    assert.equal(resB.body.data.messages[0].conversation.toString(), conversationB._id.toString());
  });

  // TC-CHAT-SEARCH-08: Exclude soft-deleted messages
  it('TC-CHAT-SEARCH-08: Exclude soft-deleted messages (deleted for everyone & deleted for me)', async () => {
    // Message deleted for everyone
    const resEveryone = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=SUPER_SECRET_KEYWORD`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resEveryone.status, 200);
    assert.equal(resEveryone.body.data.messages.length, 0);

    // Message deleted for student only -> student cannot see it
    const resStudent = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=PERSONAL_REMINDER_KEYWORD`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resStudent.status, 200);
    assert.equal(resStudent.body.data.messages.length, 0);

    // But mentor who didn't delete it can see it
    const resMentor = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=PERSONAL_REMINDER_KEYWORD`)
      .set('Authorization', `Bearer ${mentorToken}`);

    assert.equal(resMentor.status, 200);
    assert.equal(resMentor.body.data.messages.length, 1);
    assert.equal(resMentor.body.data.messages[0]._id.toString(), deletedForMeMessageId);
  });

  // TC-CHAT-SEARCH-09: No-results and request-error states
  it('TC-CHAT-SEARCH-09: Returns empty array for non-matching queries & handles invalid conversation ID', async () => {
    // Non-existent term
    const resEmpty = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages/search?q=NONEXISTENT_KEYWORD_XYZ_999`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resEmpty.status, 200);
    assert.equal(resEmpty.body.data.messages.length, 0);
    assert.equal(resEmpty.body.data.pagination.total, 0);

    // Malformed conversation ID
    const resBadId = await request(app)
      .get('/api/chat/conversations/invalid-id-123/messages/search?q=test')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resBadId.status, 400);

    // Non-existent conversation ID (valid ObjectId format)
    const nonExistentId = new mongoose.Types.ObjectId();
    const resNotFound = await request(app)
      .get(`/api/chat/conversations/${nonExistentId}/messages/search?q=test`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resNotFound.status, 404);
  });

  // TC-CHAT-SEARCH-10: Jump to message with surrounding context window via aroundMessageId
  it('TC-CHAT-SEARCH-10: Retrieves unloaded target message with surrounding chronological context', async () => {
    assert.ok(targetOldMessageId, 'Target old message ID must exist');

    const res = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages?aroundMessageId=${targetOldMessageId}&limit=10`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.messages));

    // Verify the target message is in the returned chronological array
    const foundIndex = res.body.data.messages.findIndex(
      (m) => m._id.toString() === targetOldMessageId
    );
    assert.ok(foundIndex >= 0, 'Target message must be included in returned messages');

    // Verify messages are in strictly chronological order (oldest to newest)
    for (let i = 1; i < res.body.data.messages.length; i++) {
      const prevTime = new Date(res.body.data.messages[i - 1].createdAt).getTime();
      const currTime = new Date(res.body.data.messages[i].createdAt).getTime();
      assert.ok(
        currTime >= prevTime,
        `Message ${i} (${currTime}) must be >= message ${i - 1} (${prevTime})`
      );
    }

    // Verify pagination metadata
    assert.equal(res.body.data.targetMessageId.toString(), targetOldMessageId);
    assert.ok(typeof res.body.data.pagination.hasOlder === 'boolean');
    assert.ok(typeof res.body.data.pagination.hasNewer === 'boolean');
  });

  // TC-CHAT-SEARCH-11: Invalid aroundMessageId returns 400 and non-existent returns 404
  it('TC-CHAT-SEARCH-11: Invalid aroundMessageId returns 400, non-existent returns 404', async () => {
    // Malformed ID
    const resBadId = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages?aroundMessageId=not-an-id`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resBadId.status, 400);

    // Non-existent message ID
    const fakeMsgId = new mongoose.Types.ObjectId();
    const resNotFound = await request(app)
      .get(`/api/chat/conversations/${conversationA._id}/messages?aroundMessageId=${fakeMsgId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resNotFound.status, 404);
  });
});
