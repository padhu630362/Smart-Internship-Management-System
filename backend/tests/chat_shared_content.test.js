import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { initSocket, getIO } from '../src/socket.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Conversation, CONVERSATION_TYPES } from '../src/models/Conversation.js';
import { Message, ATTACHMENT_TYPES } from '../src/models/Message.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Feature: Conversation-Specific Shared Media, Documents & Links Tests', () => {
  const timestamp = Date.now();
  const mentorEmail = `mentor_shared_${timestamp}@example.com`;
  const studentEmail = `student_shared_${timestamp}@example.com`;
  const outsiderEmail = `outsider_shared_${timestamp}@example.com`;
  const defaultPassword = 'SharedTestPass123!';

  let httpServer = null;
  let serverPort = null;
  let serverAddress = null;

  let mentorUser = null;
  let mentorToken = null;
  let studentUser = null;
  let studentToken = null;
  let outsiderUser = null;
  let outsiderToken = null;

  let conversation1 = null; // 1-on-1 (Mentor & Student)
  let conversation2 = null; // Group (Mentor & Student)
  let conversation3 = null; // Private (Mentor & Outsider)

  let msgMediaId = null;
  let msgDocsId = null;
  let msgLinksId = null;
  let msgDeletedId = null;

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

    // Create users
    mentorUser = await User.create({
      name: 'Mentor Margaret Hamilton',
      email: mentorEmail,
      passwordHash,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
      profile: {
        mentorDetails: { organization: 'Apollo Systems', designation: 'Software Lead' },
      },
    });
    mentorToken = signToken({
      id: mentorUser._id.toString(),
      role: ROLES.MENTOR,
      email: mentorEmail,
    });

    studentUser = await User.create({
      name: 'Student Alan Turing',
      email: studentEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { university: 'Cambridge', department: 'Mathematics' },
      },
    });
    studentToken = signToken({
      id: studentUser._id.toString(),
      role: ROLES.STUDENT,
      email: studentEmail,
    });

    outsiderUser = await User.create({
      name: 'Outsider Claude Shannon',
      email: outsiderEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: { university: 'MIT', department: 'Information Theory' },
      },
    });
    outsiderToken = signToken({
      id: outsiderUser._id.toString(),
      role: ROLES.STUDENT,
      email: outsiderEmail,
    });

    // Create Conversations
    // Conv 1: 1-on-1 (Mentor & Student)
    conversation1 = await Conversation.create({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [mentorUser._id, studentUser._id],
    });

    // Conv 2: Group (Mentor & Student)
    conversation2 = await Conversation.create({
      type: CONVERSATION_TYPES.GROUP,
      name: 'Apollo Guidance Cohort',
      creator: mentorUser._id,
      participants: [mentorUser._id, studentUser._id],
    });

    // Conv 3: Private (Mentor & Outsider)
    conversation3 = await Conversation.create({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [mentorUser._id, outsiderUser._id],
    });

    // Seed Messages for Conversation 1
    // 1. Message with Media (Image & Video)
    const mediaMsg = await Message.create({
      conversation: conversation1._id,
      sender: mentorUser._id,
      content: 'Here are the telemetry diagrams and simulation video.',
      attachments: [
        {
          fileName: 'guidance_telemetry.png',
          fileKey: 'uploads/chat/guidance_telemetry.png',
          fileType: 'image',
          mimeType: 'image/png',
          size: 1024 * 350,
          url: '/api/chat/attachments/guidance_telemetry.png',
        },
        {
          fileName: 'simulation_run.mp4',
          fileKey: 'uploads/chat/simulation_run.mp4',
          fileType: 'video',
          mimeType: 'video/mp4',
          size: 1024 * 1024 * 8,
          url: '/api/chat/attachments/simulation_run.mp4',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 3), // 3 hours ago
    });
    msgMediaId = mediaMsg._id.toString();

    // 2. Message with Documents (PDF & Spreadsheet)
    const docsMsg = await Message.create({
      conversation: conversation1._id,
      sender: studentUser._id,
      content: 'Attaching the internship progress report and timesheet.',
      attachments: [
        {
          fileName: 'weekly_report_week4.pdf',
          fileKey: 'uploads/chat/weekly_report_week4.pdf',
          fileType: 'pdf',
          mimeType: 'application/pdf',
          size: 1024 * 512,
          url: '/api/chat/attachments/weekly_report_week4.pdf',
        },
        {
          fileName: 'timesheet_october.xlsx',
          fileKey: 'uploads/chat/timesheet_october.xlsx',
          fileType: 'spreadsheet',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 1024 * 64,
          url: '/api/chat/attachments/timesheet_october.xlsx',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    });
    msgDocsId = docsMsg._id.toString();

    // 3. Message with Links
    const linksMsg = await Message.create({
      conversation: conversation1._id,
      sender: mentorUser._id,
      content: 'Please review https://nodejs.org/api/documentation and https://github.com/nasa/apollo-11 for reference.',
      attachments: [],
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    });
    msgLinksId = linksMsg._id.toString();

    // 4. Soft-deleted message with an attachment (should be excluded!)
    const deletedMsg = await Message.create({
      conversation: conversation1._id,
      sender: mentorUser._id,
      content: 'Deleted draft file',
      isDeleted: true,
      attachments: [
        {
          fileName: 'unwanted_scratchpad.png',
          fileKey: 'uploads/chat/unwanted_scratchpad.png',
          fileType: 'image',
          mimeType: 'image/png',
          size: 1024 * 100,
          url: '/api/chat/attachments/unwanted_scratchpad.png',
        },
      ],
      createdAt: new Date(Date.now() - 1800000),
    });
    msgDeletedId = deletedMsg._id.toString();

    // Seed Messages for Conversation 2 (Group)
    await Message.create({
      conversation: conversation2._id,
      sender: mentorUser._id,
      content: 'Cohort syllabus: https://example.edu/syllabus and onboarding deck',
      attachments: [
        {
          fileName: 'group_onboarding_deck.pptx',
          fileKey: 'uploads/chat/group_onboarding_deck.pptx',
          fileType: 'presentation',
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          size: 1024 * 1024 * 2,
          url: '/api/chat/attachments/group_onboarding_deck.pptx',
        },
      ],
    });

    // Seed Message for Conversation 3 (Private between Mentor & Outsider)
    await Message.create({
      conversation: conversation3._id,
      sender: outsiderUser._id,
      content: 'Classified cryptographic research note: https://shannon.mit.edu/secrecy',
      attachments: [
        {
          fileName: 'confidential_secrecy.pdf',
          fileKey: 'uploads/chat/confidential_secrecy.pdf',
          fileType: 'pdf',
          mimeType: 'application/pdf',
          size: 1024 * 900,
          url: '/api/chat/attachments/confidential_secrecy.pdf',
        },
      ],
    });
  });

  after(async () => {
    // Clean up created records
    try {
      if (mentorUser) await User.deleteOne({ _id: mentorUser._id });
      if (studentUser) await User.deleteOne({ _id: studentUser._id });
      if (outsiderUser) await User.deleteOne({ _id: outsiderUser._id });
      if (conversation1) await Conversation.deleteOne({ _id: conversation1._id });
      if (conversation2) await Conversation.deleteOne({ _id: conversation2._id });
      if (conversation3) await Conversation.deleteOne({ _id: conversation3._id });
      await Message.deleteMany({
        conversation: { $in: [conversation1?._id, conversation2?._id, conversation3?._id] },
      });
    } catch (err) {
      console.warn('Cleanup warning:', err.message);
    }

    const io = getIO();
    if (io) {
      await new Promise((resolve) => io.close(resolve));
    }
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    await mongoose.connection.close();
  });

  it('TC-01: Retrieves all shared content with aggregated counts for a conversation', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/shared-content`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.counts);

    // Counts check:
    // Media: 2 (telemetry image + simulation video)
    // Documents: 2 (weekly report pdf + timesheet xlsx)
    // Links: 2 (nodejs.org + github.com)
    // Total: 6
    assert.equal(res.body.data.counts.media, 2);
    assert.equal(res.body.data.counts.documents, 2);
    assert.equal(res.body.data.counts.links, 2);
    assert.equal(res.body.data.counts.total, 6);

    // Verify all 6 items returned by default (type=all)
    assert.equal(res.body.data.items.length, 6);
  });

  it('TC-02: Filters shared content by type=media (image and video attachments)', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/shared-content?type=media`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.items.length, 2);

    const filenames = res.body.data.items.map((i) => i.fileName);
    assert.ok(filenames.includes('guidance_telemetry.png'));
    assert.ok(filenames.includes('simulation_run.mp4'));

    const videoItem = res.body.data.items.find((i) => i.fileName === 'simulation_run.mp4');
    assert.equal(videoItem.fileType, 'video');
    assert.equal(videoItem.messageId, msgMediaId);
    assert.ok(videoItem.sender);
    assert.equal(videoItem.sender.name, 'Mentor Margaret Hamilton');
  });

  it('TC-03: Filters shared content by type=documents (PDF, spreadsheets, presentations)', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/shared-content?type=documents`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.items.length, 2);

    const filenames = res.body.data.items.map((i) => i.fileName);
    assert.ok(filenames.includes('weekly_report_week4.pdf'));
    assert.ok(filenames.includes('timesheet_october.xlsx'));

    const pdfItem = res.body.data.items.find((i) => i.fileName === 'weekly_report_week4.pdf');
    assert.equal(pdfItem.fileType, 'pdf');
    assert.equal(pdfItem.messageId, msgDocsId);
    assert.equal(pdfItem.sender.name, 'Student Alan Turing');
  });

  it('TC-04: Filters shared content by type=links (extracts URLs and hostname)', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/shared-content?type=links`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.items.length, 2);

    const urls = res.body.data.items.map((i) => i.url);
    assert.ok(urls.some((u) => u.includes('nodejs.org')));
    assert.ok(urls.some((u) => u.includes('github.com')));

    const nodeItem = res.body.data.items.find((i) => i.url.includes('nodejs.org'));
    assert.equal(nodeItem.domain, 'nodejs.org');
    assert.equal(nodeItem.messageId, msgLinksId);
    assert.ok(nodeItem.contentSnippet.includes('Please review'));
  });

  it('TC-05: Strict conversation isolation - Conversation 1 items never appear in Conversation 2', async () => {
    const resConv2 = await request(app)
      .get(`/api/chat/conversations/${conversation2._id}/shared-content`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resConv2.status, 200);
    assert.equal(resConv2.body.data.counts.documents, 1);
    assert.equal(resConv2.body.data.counts.links, 1);
    assert.equal(resConv2.body.data.counts.media, 0);

    const filenames = resConv2.body.data.items.map((i) => i.fileName || i.url);
    assert.ok(filenames.includes('group_onboarding_deck.pptx'));
    assert.ok(!filenames.includes('weekly_report_week4.pdf'));
    assert.ok(!filenames.includes('guidance_telemetry.png'));
  });

  it('TC-06: Excludes soft-deleted messages from shared content', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/shared-content?type=media`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const filenames = res.body.data.items.map((i) => i.fileName);
    assert.ok(!filenames.includes('unwanted_scratchpad.png'), 'Deleted attachment must not be returned');
  });

  it('TC-07: Supports sorting: newest first (desc) and oldest first (asc)', async () => {
    const resDesc = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/shared-content?sort=desc`)
      .set('Authorization', `Bearer ${studentToken}`);

    const resAsc = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/shared-content?sort=asc`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resDesc.status, 200);
    assert.equal(resAsc.status, 200);

    const firstDesc = new Date(resDesc.body.data.items[0].createdAt).getTime();
    const lastDesc = new Date(resDesc.body.data.items[resDesc.body.data.items.length - 1].createdAt).getTime();
    assert.ok(firstDesc >= lastDesc, 'Desc order should have first item >= last item');

    const firstAsc = new Date(resAsc.body.data.items[0].createdAt).getTime();
    const lastAsc = new Date(resAsc.body.data.items[resAsc.body.data.items.length - 1].createdAt).getTime();
    assert.ok(firstAsc <= lastAsc, 'Asc order should have first item <= last item');
  });

  it('TC-08: Filters shared items using search query', async () => {
    // Search for "timesheet_october"
    const resSearch = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/shared-content?search=timesheet_october`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resSearch.status, 200);
    assert.equal(resSearch.body.data.items.length, 1);
    assert.equal(resSearch.body.data.items[0].fileName, 'timesheet_october.xlsx');

    // Search for "github" in links
    const resLinkSearch = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/shared-content?type=links&search=github`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resLinkSearch.status, 200);
    assert.equal(resLinkSearch.body.data.items.length, 1);
    assert.ok(resLinkSearch.body.data.items[0].url.includes('github.com'));
  });

  it('TC-09: Authorization check - 403 Forbidden when non-participant requests shared content', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/shared-content`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    assert.equal(res.status, 403);
    const errMessage = res.body.error?.message || res.body.message || '';
    assert.match(errMessage, /access denied|not authorized|member/i);
  });

  it('TC-10: Shortcut endpoints /media, /documents, /links return expected subsets', async () => {
    const resMedia = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/media`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resMedia.status, 200);
    assert.equal(resMedia.body.data.items.length, 2);

    const resDocs = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/documents`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resDocs.status, 200);
    assert.equal(resDocs.body.data.items.length, 2);

    const resLinks = await request(app)
      .get(`/api/chat/conversations/${conversation1._id}/links`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resLinks.status, 200);
    assert.equal(resLinks.body.data.items.length, 2);
  });

  it('TC-11: Link preview SSRF protection - blocks loopback and private IPs', async () => {
    // 1. Localhost
    const resLocalhost = await request(app)
      .get('/api/chat/link-preview?url=http://localhost:5001/api/health')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resLocalhost.status, 403);
    assert.match(resLocalhost.body.message, /forbidden|private|loopback/i);

    // 2. 127.0.0.1
    const resLoopback = await request(app)
      .get('/api/chat/link-preview?url=http://127.0.0.1:8080/secret')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resLoopback.status, 403);
    assert.match(resLoopback.body.message, /forbidden|private|loopback/i);

    // 3. Private 192.168.1.1
    const resPrivate = await request(app)
      .get('/api/chat/link-preview?url=http://192.168.1.1/admin')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resPrivate.status, 403);
    assert.match(resPrivate.body.message, /forbidden|private|loopback/i);
  });

  it('TC-12: Link preview handles invalid or non-http protocols gracefully', async () => {
    const resFile = await request(app)
      .get('/api/chat/link-preview?url=file:///etc/passwd')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resFile.status, 400);
    assert.match(resFile.body.message, /http|valid/i);

    const resEmpty = await request(app)
      .get('/api/chat/link-preview')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resEmpty.status, 400);
  });
});
