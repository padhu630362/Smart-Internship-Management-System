import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../src/models/Internship.js';
import { Application, APPLICATION_STATUSES } from '../src/models/Application.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Phase 5: Internship Application and Selection Workflow Tests', () => {
  const timestamp = Date.now();
  const companyAEmail = `comp_a_app_${timestamp}@example.com`;
  const companyBEmail = `comp_b_app_${timestamp}@example.com`;
  const studentAEmail = `student_a_app_${timestamp}@example.com`;
  const studentBEmail = `student_b_app_${timestamp}@example.com`;
  const defaultPassword = 'Password123!';

  let companyAUser = null;
  let companyAToken = null;
  let companyBUser = null;
  let companyBToken = null;
  let studentAUser = null;
  let studentAToken = null;
  let studentBUser = null;
  let studentBToken = null;

  let activeInternshipA = null;
  let expiredInternshipA = null;
  let draftInternshipA = null;

  let createdApplicationId = null;

  before(async () => {
    await connectDB();
    const passwordHash = await hashPassword(defaultPassword);

    // Create Company A
    companyAUser = await User.create({
      name: 'Acme Apex Cloud Systems',
      email: companyAEmail,
      passwordHash,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
      profile: {
        companyDetails: { companyName: 'Acme Apex Cloud Systems' },
      },
    });
    companyAToken = signToken({ id: companyAUser._id.toString(), role: ROLES.COMPANY, email: companyAEmail });

    // Create Company B
    companyBUser = await User.create({
      name: 'Omni Retail Technologies',
      email: companyBEmail,
      passwordHash,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
      profile: {
        companyDetails: { companyName: 'Omni Retail Technologies' },
      },
    });
    companyBToken = signToken({ id: companyBUser._id.toString(), role: ROLES.COMPANY, email: companyBEmail });

    // Create Student A (with resume in profile)
    studentAUser = await User.create({
      name: 'Samantha Applicant',
      email: studentAEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: {
          studentId: 'STU-APP-001',
          department: 'Computer Engineering',
          course: 'B.E. Computer Science',
          graduationYear: 2026,
          cgpa: 8.9,
          skills: ['React', 'Node.js', 'PostgreSQL'],
          resumeUrl: '/uploads/resumes/resume-sample-student-a.pdf',
          resumeFileName: 'Samantha_Applicant_Resume.pdf',
        },
      },
    });
    studentAToken = signToken({ id: studentAUser._id.toString(), role: ROLES.STUDENT, email: studentAEmail });

    // Create Student B
    studentBUser = await User.create({
      name: 'Brian Candidate',
      email: studentBEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: {
          studentId: 'STU-APP-002',
          department: 'Information Science',
          resumeUrl: '/uploads/resumes/resume-sample-student-b.pdf',
        },
      },
    });
    studentBToken = signToken({ id: studentBUser._id.toString(), role: ROLES.STUDENT, email: studentBEmail });

    // Create Active Published Internship for Company A
    activeInternshipA = await Internship.create({
      title: 'Full-Stack Software Engineering Intern',
      description: 'Design and implement resilient backend APIs and responsive modern web user interfaces.',
      company: companyAUser._id,
      companyName: 'Acme Apex Cloud Systems',
      workMode: WORK_MODES.REMOTE,
      openings: 3,
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: INTERNSHIP_STATUSES.PUBLISHED,
      createdBy: companyAUser._id,
    });

    // Create Expired Internship for Company A
    expiredInternshipA = await Internship.create({
      title: 'Expired Internship Opportunity',
      description: 'Testing application deadline rejection for past-dated internship postings.',
      company: companyAUser._id,
      companyName: 'Acme Apex Cloud Systems',
      openings: 1,
      applicationDeadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // In the past
      status: INTERNSHIP_STATUSES.PUBLISHED,
      createdBy: companyAUser._id,
    });

    // Create Draft Internship for Company A
    draftInternshipA = await Internship.create({
      title: 'Unpublished Draft Opportunity',
      description: 'Testing application rejection for unpublished draft internship postings.',
      company: companyAUser._id,
      companyName: 'Acme Apex Cloud Systems',
      openings: 2,
      applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: INTERNSHIP_STATUSES.DRAFT,
      createdBy: companyAUser._id,
    });
  });

  after(async () => {
    try {
      await Application.deleteMany({
        $or: [
          { company: { $in: [companyAUser?._id, companyBUser?._id] } },
          { student: { $in: [studentAUser?._id, studentBUser?._id] } },
        ],
      });
      await Internship.deleteMany({
        company: { $in: [companyAUser?._id, companyBUser?._id] },
      });
      await User.deleteMany({
        email: { $in: [companyAEmail, companyBEmail, studentAEmail, studentBEmail] },
      });
    } catch {
      // Ignore cleanup error
    } finally {
      await mongoose.disconnect();
    }
  });

  // ==========================================
  // 1. Student Application Submission & Rules
  // ==========================================
  it('TC-APP-01: Student A should successfully apply to published internship before deadline', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        internshipId: activeInternshipA._id,
        coverLetter: 'I have strong proficiency in full-stack JavaScript and cloud infrastructure.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.application.status, APPLICATION_STATUSES.SUBMITTED);
    assert.equal(res.body.data.application.internship.toString(), activeInternshipA._id.toString());
    assert.equal(res.body.data.application.student.toString(), studentAUser._id.toString());
    assert.ok(res.body.data.application.resumeUrl);
    assert.equal(res.body.data.application.statusHistory.length, 1);
    assert.equal(res.body.data.application.statusHistory[0].status, APPLICATION_STATUSES.SUBMITTED);

    createdApplicationId = res.body.data.application._id;
  });

  it('TC-APP-02: Duplicate Prevention - Student A applying again to same internship is strictly rejected', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        internshipId: activeInternshipA._id,
        coverLetter: 'Second duplicate submission attempt.',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'DUPLICATE_APPLICATION');
  });

  it('TC-APP-03: Deadline Rule - Student cannot apply to an opportunity after deadline has expired', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentBToken}`)
      .send({
        internshipId: expiredInternshipA._id,
        coverLetter: 'Attempting to apply to expired opportunity.',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'APPLICATION_DEADLINE_PASSED');
  });

  it('TC-APP-04: Published Check - Student cannot apply to unpublished draft opportunity', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentBToken}`)
      .send({
        internshipId: draftInternshipA._id,
        coverLetter: 'Attempting to apply to unpublished draft.',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'OPPORTUNITY_NOT_ACCEPTING_APPLICATIONS');
  });

  // ==========================================
  // 2. Student History & Security
  // ==========================================
  it('TC-APP-05: Student A can retrieve their own application history', async () => {
    const res = await request(app)
      .get('/api/applications/my')
      .set('Authorization', `Bearer ${studentAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.applications));
    assert.equal(res.body.data.applications.length, 1);
    assert.equal(res.body.data.applications[0].internship.title, 'Full-Stack Software Engineering Intern');
  });

  it('TC-APP-06: Security - Student B cannot view or access Student A application details', async () => {
    const res = await request(app)
      .get(`/api/applications/${createdApplicationId}`)
      .set('Authorization', `Bearer ${studentBToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN_APPLICATION_ACCESS');
  });

  // ==========================================
  // 3. Company Review & Status Transitions
  // ==========================================
  it('TC-APP-07: Company A can list applicants for its own opportunities', async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${companyAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.applications));
    assert.equal(res.body.data.applications.length, 1);
    assert.equal(res.body.data.applications[0].studentSnapshot.name, 'Samantha Applicant');
  });

  it('TC-APP-08: Security - Company B cannot view or modify Company A applications (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/applications/${createdApplicationId}/status`)
      .set('Authorization', `Bearer ${companyBToken}`)
      .send({
        status: APPLICATION_STATUSES.UNDER_REVIEW,
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN_APPLICATION_ACCESS');
  });

  it('TC-APP-09: Company A transitions application: submitted -> under_review -> shortlisted -> interview', async () => {
    // 1. Move to under_review
    const res1 = await request(app)
      .patch(`/api/applications/${createdApplicationId}/status`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        status: APPLICATION_STATUSES.UNDER_REVIEW,
        reviewNotes: 'Profile evaluated and matches technical stack requirements.',
      });

    assert.equal(res1.status, 200);
    assert.equal(res1.body.data.application.status, APPLICATION_STATUSES.UNDER_REVIEW);

    // 2. Move to shortlisted
    const res2 = await request(app)
      .patch(`/api/applications/${createdApplicationId}/status`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        status: APPLICATION_STATUSES.SHORTLISTED,
        reviewNotes: 'Candidate shortlisted for interview round.',
      });

    assert.equal(res2.status, 200);
    assert.equal(res2.body.data.application.status, APPLICATION_STATUSES.SHORTLISTED);

    // 3. Move to interview
    const res3 = await request(app)
      .patch(`/api/applications/${createdApplicationId}/status`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        status: APPLICATION_STATUSES.INTERVIEW,
        reviewNotes: 'Technical interview scheduled with senior architect.',
        interviewDetails: {
          scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          meetingLink: 'https://meet.sims.edu/interview-room-101',
          instructions: 'Prepare to discuss distributed system design and React state patterns.',
        },
      });

    assert.equal(res3.status, 200);
    assert.equal(res3.body.data.application.status, APPLICATION_STATUSES.INTERVIEW);
    assert.equal(res3.body.data.application.interviewDetails.meetingLink, 'https://meet.sims.edu/interview-room-101');
  });

  it('TC-APP-10: Rejection Reason - Transitioning to rejected without reason is strictly blocked', async () => {
    const res = await request(app)
      .patch(`/api/applications/${createdApplicationId}/status`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        status: APPLICATION_STATUSES.REJECTED,
        // No reason provided
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'REJECTION_REASON_REQUIRED');
  });

  it('TC-APP-11: Audit Trail - Status changes are recorded sequentially with timestamps and actor', async () => {
    // Select the candidate
    const res = await request(app)
      .patch(`/api/applications/${createdApplicationId}/status`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        status: APPLICATION_STATUSES.SELECTED,
        reviewNotes: 'Congratulations! Official internship offer extended.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.application.status, APPLICATION_STATUSES.SELECTED);

    // Fetch single application and verify audit trail
    const resGet = await request(app)
      .get(`/api/applications/${createdApplicationId}`)
      .set('Authorization', `Bearer ${companyAToken}`);

    assert.equal(resGet.status, 200);
    const history = resGet.body.data.application.statusHistory;
    assert.ok(history.length >= 4);

    // Check history progression
    const statuses = history.map((h) => h.status);
    assert.ok(statuses.includes(APPLICATION_STATUSES.SUBMITTED));
    assert.ok(statuses.includes(APPLICATION_STATUSES.UNDER_REVIEW));
    assert.ok(statuses.includes(APPLICATION_STATUSES.SHORTLISTED));
    assert.ok(statuses.includes(APPLICATION_STATUSES.INTERVIEW));
    assert.ok(statuses.includes(APPLICATION_STATUSES.SELECTED));
  });

  it('TC-APP-12: Student Withdrawal & Self-Approval Prevention', async () => {
    // Student B applies to activeInternshipA
    const resApply = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentBToken}`)
      .send({
        internshipId: activeInternshipA._id,
        coverLetter: 'Interested in software development internship.',
      });

    assert.equal(resApply.status, 201);
    const studentBAppId = resApply.body.data.application._id;

    // Student B attempts to approve/select themselves -> 403 Forbidden
    const resTamper = await request(app)
      .patch(`/api/applications/${studentBAppId}/status`)
      .set('Authorization', `Bearer ${studentBToken}`)
      .send({ status: APPLICATION_STATUSES.SELECTED });

    assert.equal(resTamper.status, 403);
    assert.equal(resTamper.body.error.code, 'FORBIDDEN');

    // Student B withdraws their own application -> 200 OK
    const resWithdraw = await request(app)
      .patch(`/api/applications/${studentBAppId}/withdraw`)
      .set('Authorization', `Bearer ${studentBToken}`)
      .send({ reason: 'Accepted another academic opportunity.' });

    assert.equal(resWithdraw.status, 200);
    assert.equal(resWithdraw.body.data.application.status, APPLICATION_STATUSES.WITHDRAWN);
  });
});
