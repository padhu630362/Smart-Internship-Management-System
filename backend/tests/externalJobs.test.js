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
import { ExternalJob, JOB_TYPES, JOB_SOURCES } from '../src/models/ExternalJob.js';
import { UserJobBookmark } from '../src/models/UserJobBookmark.js';
import { Notification, NOTIFICATION_TYPES } from '../src/models/Notification.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';
import { matchExternalJobWithGemini } from '../src/services/aiService.js';
import { dispatchJobAlertsToStudents } from '../src/services/jobFeedService.js';

describe('Phase 12: Real-Time Job & Internship Notification System Tests', () => {
  const timestamp = Date.now();
  const studentEmail = `ext_student_${timestamp}@example.com`;
  const companyEmail = `ext_company_${timestamp}@example.com`;
  const defaultPassword = 'Password123!';

  let httpServer = null;
  let serverPort = null;
  let serverAddress = null;

  let studentUser = null;
  let studentToken = null;
  let companyUser = null;
  let companyToken = null;

  let sampleJob1 = null;
  let sampleJob2 = null;
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

    // Create active Student with tech skills
    studentUser = await User.create({
      email: studentEmail,
      passwordHash,
      name: 'Jane Developer',
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        department: 'Computer Science',
        bio: 'Passionate full-stack developer with React and Node.js skills.',
        studentDetails: {
          studentId: `STU-${timestamp}`,
          department: 'Computer Science',
          course: 'B.Tech CS',
          skills: ['React', 'Node.js', 'TypeScript', 'MongoDB'],
          cgpa: 8.9,
        },
      },
    });
    studentToken = signToken({ id: studentUser._id, role: studentUser.role, email: studentUser.email });

    // Create Company User (for RBAC testing)
    companyUser = await User.create({
      email: companyEmail,
      passwordHash,
      name: 'Tech Corp Employer',
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
    });
    companyToken = signToken({ id: companyUser._id, role: companyUser.role, email: companyUser.email });

    // Seed sample external jobs
    sampleJob1 = await ExternalJob.create({
      externalId: `arbeitnow-test-${timestamp}-1`,
      canonicalUrl: `https://www.arbeitnow.com/view/react-intern-${timestamp}`,
      title: 'Full Stack React & Node.js Intern',
      company: 'Innovatech Global',
      location: 'Berlin / Remote',
      isRemote: true,
      jobType: JOB_TYPES.INTERNSHIP,
      description: 'We are seeking a Full Stack Intern proficient in React, Node.js, and modern JavaScript web technologies.',
      snippet: 'Full Stack React and Node.js internship opening for university students.',
      tags: ['react', 'node.js', 'javascript', 'internship'],
      source: 'Arbeitnow',
      sourceUrl: `https://www.arbeitnow.com/view/react-intern-${timestamp}`,
      publishedAt: new Date(),
    });

    sampleJob2 = await ExternalJob.create({
      externalId: `remoteok-test-${timestamp}-2`,
      canonicalUrl: `https://remoteok.com/remote-jobs/python-dev-${timestamp}`,
      title: 'Junior Python AI Engineer',
      company: 'DataFlow Systems',
      location: 'Worldwide Remote',
      isRemote: true,
      jobType: JOB_TYPES.ENTRY_LEVEL,
      description: 'Junior role working on Python data pipelines and machine learning algorithms.',
      snippet: 'Entry-level Python AI developer role with remote flexibility.',
      tags: ['python', 'machine learning', 'ai'],
      source: 'RemoteOK',
      sourceUrl: `https://remoteok.com/remote-jobs/python-dev-${timestamp}`,
      publishedAt: new Date(Date.now() - 3600000),
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
    } catch {}

    try {
      if (httpServer && httpServer.listening) {
        httpServer.closeAllConnections?.();
        await new Promise((resolve) => httpServer.close(resolve));
      }
    } catch {}

    // Clean up test data
    try {
      await User.deleteMany({ email: { $in: [studentEmail, companyEmail] } });
      await ExternalJob.deleteMany({ externalId: new RegExp(`test-${timestamp}`) });
      await ExternalJob.deleteMany({ externalId: new RegExp(`dispatch-test-${timestamp}`) });
      await UserJobBookmark.deleteMany({ user: studentUser?._id });
      await Notification.deleteMany({ recipient: studentUser?._id });
    } catch {}

    try {
      await mongoose.disconnect();
    } catch {}
  });

  it('TC-EXT-01: Publicly query external jobs with filtering and pagination', async () => {
    const res = await request(app)
      .get('/api/external-jobs?page=1&limit=10')
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.jobs));
    assert.ok(res.body.data.jobs.length >= 2);
    assert.ok(res.body.data.pagination.total >= 2);

    // Verify filter by jobType
    const filterRes = await request(app)
      .get(`/api/external-jobs?jobType=${JOB_TYPES.INTERNSHIP}`)
      .expect(200);

    assert.equal(filterRes.body.success, true);
    const hasOnlyInternships = filterRes.body.data.jobs.every(
      (j) => j.jobType === JOB_TYPES.INTERNSHIP
    );
    assert.ok(hasOnlyInternships);
  });

  it('TC-EXT-02: Compliant official LinkedIn search links generated with proper encoding', async () => {
    const job = await ExternalJob.findById(sampleJob1._id);
    assert.ok(job.linkedInSearchUrl);
    assert.ok(job.linkedInSearchUrl.startsWith('https://www.linkedin.com/jobs/search/?keywords='));
    // Verify encoded title and company are present in LinkedIn URL
    assert.ok(job.linkedInSearchUrl.includes('Innovatech'));
    assert.ok(job.linkedInSearchUrl.includes('React'));
  });

  it('TC-EXT-03: Displays verified provider source attribution for each opportunity', async () => {
    const res = await request(app)
      .get('/api/external-jobs')
      .expect(200);

    const arbeitnowItem = res.body.data.jobs.find((j) => j.externalId === sampleJob1.externalId);
    assert.ok(arbeitnowItem);
    assert.equal(arbeitnowItem.source, 'Arbeitnow');

    const remoteokItem = res.body.data.jobs.find((j) => j.externalId === sampleJob2.externalId);
    assert.ok(remoteokItem);
    assert.equal(remoteokItem.source, 'RemoteOK');
  });

  it('TC-EXT-04: AI Fit matching calculates accurate scores and structured rationale', async () => {
    const studentProfile = {
      name: 'Jane Developer',
      department: 'Computer Science',
      skills: ['React', 'Node.js', 'MongoDB', 'JavaScript'],
      bio: 'Enthusiastic web engineer',
    };

    const matchResult = await matchExternalJobWithGemini({
      studentProfile,
      job: sampleJob1,
    });

    assert.ok(typeof matchResult.matchScore === 'number');
    assert.ok(matchResult.matchScore >= 60, `Score expected >= 60, got ${matchResult.matchScore}`);
    assert.ok(Array.isArray(matchResult.matchedSkills));
    assert.ok(matchResult.matchedSkills.some((s) => s.toLowerCase().includes('react')));
    assert.ok(matchResult.fitReason);
    assert.ok(['High Match', 'Moderate Fit', 'Exploratory'].includes(matchResult.recommendationLevel));
  });

  it('TC-EXT-05: Authenticated student can bookmark and unbookmark an external job', async () => {
    // Bookmark
    const saveRes = await request(app)
      .post(`/api/external-jobs/${sampleJob1._id}/bookmark`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    assert.equal(saveRes.body.success, true);
    assert.equal(saveRes.body.data.isBookmarked, true);

    // Verify bookmark persisted in DB
    const bookmarkDoc = await UserJobBookmark.findOne({
      user: studentUser._id,
      externalJob: sampleJob1._id,
    });
    assert.ok(bookmarkDoc);
    assert.equal(bookmarkDoc.isBookmarked, true);

    // Unbookmark
    const unsaveRes = await request(app)
      .post(`/api/external-jobs/${sampleJob1._id}/bookmark`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    assert.equal(unsaveRes.body.success, true);
    assert.equal(unsaveRes.body.data.isBookmarked, false);
  });

  it('TC-EXT-06: Authenticated student can mark job as applied and record notes', async () => {
    // Mark as applied
    const applyRes = await request(app)
      .post(`/api/external-jobs/${sampleJob1._id}/apply`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    assert.equal(applyRes.body.success, true);
    assert.equal(applyRes.body.data.isApplied, true);
    assert.ok(applyRes.body.data.appliedAt);

    // Add personal notes
    const noteRes = await request(app)
      .patch(`/api/external-jobs/${sampleJob1._id}/notes`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ notes: 'Applied via company portal and cross-checked on LinkedIn.' })
      .expect(200);

    assert.equal(noteRes.body.success, true);
    assert.equal(noteRes.body.data.notes, 'Applied via company portal and cross-checked on LinkedIn.');
  });

  it('TC-EXT-07: Student can retrieve their bookmarked and applied job interactions', async () => {
    // Ensure sampleJob1 is bookmarked
    await request(app)
      .post(`/api/external-jobs/${sampleJob1._id}/bookmark`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    const listRes = await request(app)
      .get('/api/external-jobs/my-interactions')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    assert.equal(listRes.body.success, true);
    assert.ok(listRes.body.data.bookmarked.some((j) => j._id.toString() === sampleJob1._id.toString()));
    assert.ok(listRes.body.data.applied.some((j) => j._id.toString() === sampleJob1._id.toString()));
  });

  it('TC-EXT-08: Job feed deduplication prevents duplicate records by canonical URL or externalId', async () => {
    const preCount = await ExternalJob.countDocuments({ canonicalUrl: sampleJob1.canonicalUrl });
    assert.equal(preCount, 1);

    // Attempt to insert duplicate
    try {
      await ExternalJob.create({
        externalId: sampleJob1.externalId, // duplicate
        canonicalUrl: sampleJob1.canonicalUrl,
        title: sampleJob1.title,
        company: sampleJob1.company,
        description: 'Duplicate listing test',
        source: 'Arbeitnow',
        sourceUrl: sampleJob1.sourceUrl,
      });
      assert.fail('Should have rejected duplicate externalId');
    } catch (err) {
      assert.ok(err.code === 11000 || err.message.includes('duplicate'));
    }
  });

  it('TC-EXT-09: Real-time Job Alert dispatches via Socket.IO and persists in Notifications', async () => {
    // Connect student to Socket.IO
    studentSocket = Client(serverAddress, {
      auth: { token: studentToken },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      studentSocket.on('connect', resolve);
      studentSocket.on('connect_error', reject);
    });

    const receivedAlertPromise = new Promise((resolve) => {
      studentSocket.on('notification:new', (notif) => {
        if (notif.type === NOTIFICATION_TYPES.JOB_ALERT) {
          resolve(notif);
        }
      });
    });

    // Create a new matching job and trigger alert dispatch
    const brandNewJob = await ExternalJob.create({
      externalId: `dispatch-test-${timestamp}`,
      canonicalUrl: `https://www.arbeitnow.com/view/react-alert-${timestamp}`,
      title: 'Junior React Frontend Developer',
      company: 'TechWave Dynamics',
      location: 'Remote',
      isRemote: true,
      jobType: JOB_TYPES.INTERNSHIP,
      description: 'Looking for a junior React and Node developer.',
      tags: ['react', 'node.js'],
      source: 'Arbeitnow',
      sourceUrl: `https://www.arbeitnow.com/view/react-alert-${timestamp}`,
    });

    const dispatchedCount = await dispatchJobAlertsToStudents([brandNewJob]);
    assert.ok(dispatchedCount >= 1, 'Expected at least 1 job alert dispatched to matching student');

    // Wait for Socket.IO event
    const liveNotif = await Promise.race([
      receivedAlertPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Socket.IO notification timeout')), 5000)),
    ]);

    assert.ok(liveNotif);
    assert.equal(liveNotif.type, NOTIFICATION_TYPES.JOB_ALERT);
    assert.ok(liveNotif.title.includes('TechWave Dynamics') || liveNotif.title.includes('React'));
    assert.equal(liveNotif.link, '/external-jobs');
  });

  it('TC-EXT-10: Student can clear all notifications via DELETE /api/notifications', async () => {
    const clearRes = await request(app)
      .delete('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    assert.equal(clearRes.body.success, true);
    assert.equal(clearRes.body.data.unreadCount, 0);

    const remaining = await Notification.countDocuments({ recipient: studentUser._id });
    assert.equal(remaining, 0);
  });

  it('TC-EXT-11: Security - Anonymous and Non-Student users cannot bookmark jobs', async () => {
    // Anonymous request
    await request(app)
      .post(`/api/external-jobs/${sampleJob1._id}/bookmark`)
      .expect(401);

    // Company user (non-student)
    const forbiddenRes = await request(app)
      .post(`/api/external-jobs/${sampleJob1._id}/bookmark`)
      .set('Authorization', `Bearer ${companyToken}`)
      .expect(403);

    assert.equal(forbiddenRes.body.success, false);
    assert.equal(forbiddenRes.body.error?.code, 'FORBIDDEN');
  });
});



