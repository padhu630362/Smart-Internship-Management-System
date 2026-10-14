import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../src/models/Internship.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Phase 4: Company and Internship Opportunity Management Tests', () => {
  const timestamp = Date.now();
  const companyAEmail = `comp_a_${timestamp}@example.com`;
  const companyBEmail = `comp_b_${timestamp}@example.com`;
  const studentEmail = `student_int_${timestamp}@example.com`;
  const coordinatorEmail = `coord_int_${timestamp}@example.com`;
  const defaultPassword = 'Password123!';

  let companyAUser = null;
  let companyAToken = null;
  let companyBUser = null;
  let companyBToken = null;
  let studentUser = null;
  let studentToken = null;
  let coordinatorUser = null;
  let coordinatorToken = null;

  let createdDraftId = null;
  let createdPublishedId = null;

  before(async () => {
    await connectDB();
    const passwordHash = await hashPassword(defaultPassword);

    // Create Company A
    companyAUser = await User.create({
      name: 'Acme Cloud Technologies',
      email: companyAEmail,
      passwordHash,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
      profile: {
        companyDetails: {
          companyName: 'Acme Cloud Technologies',
          industry: 'Cloud Infrastructure',
        },
      },
    });
    companyAToken = signToken({ id: companyAUser._id.toString(), role: ROLES.COMPANY, email: companyAEmail });

    // Create Company B
    companyBUser = await User.create({
      name: 'Beta Global Software',
      email: companyBEmail,
      passwordHash,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
      profile: {
        companyDetails: {
          companyName: 'Beta Global Software',
          industry: 'Enterprise SaaS',
        },
      },
    });
    companyBToken = signToken({ id: companyBUser._id.toString(), role: ROLES.COMPANY, email: companyBEmail });

    // Create Student
    studentUser = await User.create({
      name: 'Sam Student Intern',
      email: studentEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
    });
    studentToken = signToken({ id: studentUser._id.toString(), role: ROLES.STUDENT, email: studentEmail });

    // Create Coordinator
    coordinatorUser = await User.create({
      name: 'Dr. Placement Director',
      email: coordinatorEmail,
      passwordHash,
      role: ROLES.COORDINATOR,
      status: USER_STATUSES.ACTIVE,
    });
    coordinatorToken = signToken({ id: coordinatorUser._id.toString(), role: ROLES.COORDINATOR, email: coordinatorEmail });
  });

  after(async () => {
    try {
      await Internship.deleteMany({
        $or: [
          { company: { $in: [companyAUser?._id, companyBUser?._id] } },
          { createdBy: { $in: [companyAUser?._id, companyBUser?._id, coordinatorUser?._id] } },
        ],
      });
      await User.deleteMany({
        email: { $in: [companyAEmail, companyBEmail, studentEmail, coordinatorEmail] },
      });
    } catch {
      // Ignore cleanup error
    } finally {
      await mongoose.disconnect();
    }
  });

  // ==========================================
  // 1. Opportunity Creation & Validation
  // ==========================================
  it('TC-INT-01: Company A should successfully create a new internship opportunity in draft state', async () => {
    const futureDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/internships')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        title: 'Backend Systems Engineering Intern',
        description: 'Design and optimize scalable distributed microservices and database query engines.',
        workMode: WORK_MODES.REMOTE,
        location: 'Remote, US/Worldwide',
        openings: 3,
        duration: '6 Months',
        requiredSkills: ['Node.js', 'Express', 'MongoDB', 'Docker'],
        stipend: {
          hasStipend: true,
          amount: 2500,
          currency: 'USD',
          periodicity: 'monthly',
        },
        eligibility: {
          minCgpa: 7.5,
          allowedDepartments: ['Computer Science', 'Information Technology'],
          allowedGraduationYears: [2026, 2027],
        },
        applicationDeadline: futureDeadline,
        status: INTERNSHIP_STATUSES.DRAFT,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.opportunity.title, 'Backend Systems Engineering Intern');
    assert.equal(res.body.data.opportunity.status, INTERNSHIP_STATUSES.DRAFT);
    assert.equal(res.body.data.opportunity.companyName, 'Acme Cloud Technologies');
    assert.equal(res.body.data.opportunity.openings, 3);

    createdDraftId = res.body.data.opportunity._id;
  });

  it('TC-INT-02: Company A should create and publish an internship opportunity', async () => {
    const futureDeadline = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/internships')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        title: 'Frontend React UI/UX Engineer Intern',
        description: 'Build enterprise design system components, state managers, and data visualization dashboards.',
        workMode: WORK_MODES.HYBRID,
        location: 'San Francisco, CA / Hybrid',
        openings: 2,
        duration: '3 Months',
        requiredSkills: ['React', 'JavaScript', 'Tailwind CSS', 'Vite'],
        stipend: {
          hasStipend: true,
          amount: 3000,
          currency: 'USD',
          periodicity: 'monthly',
        },
        applicationDeadline: futureDeadline,
        status: INTERNSHIP_STATUSES.PUBLISHED,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.opportunity.status, INTERNSHIP_STATUSES.PUBLISHED);

    createdPublishedId = res.body.data.opportunity._id;
  });

  it('TC-INT-03: Validation - Should reject opportunity with past application deadline', async () => {
    const pastDeadline = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/internships')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        title: 'Invalid Past Date Opportunity',
        description: 'This opportunity contains an application deadline that has already passed.',
        openings: 1,
        applicationDeadline: pastDeadline,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('future date'));
  });

  it('TC-INT-04: Validation - Should reject opportunity with invalid or zero openings', async () => {
    const futureDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/internships')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        title: 'Zero Openings Opportunity',
        description: 'Testing validation when openings field is set to zero or negative count.',
        openings: 0,
        applicationDeadline: futureDeadline,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  // ==========================================
  // 2. Student & Public Directory Browsing
  // ==========================================
  it('TC-INT-05: Students can browse published opportunities in public directory', async () => {
    const res = await request(app)
      .get('/api/internships')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.opportunities));
    assert.ok(res.body.data.opportunities.length >= 1);

    // Verify all returned opportunities have status === 'published'
    const nonPublished = res.body.data.opportunities.filter(
      (opp) => opp.status !== INTERNSHIP_STATUSES.PUBLISHED
    );
    assert.equal(nonPublished.length, 0, 'Public directory must never show non-published opportunities');
  });

  it('TC-INT-06: Security - Students cannot access unpublished draft opportunities', async () => {
    const res = await request(app)
      .get(`/api/internships/${createdDraftId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'OPPORTUNITY_NOT_PUBLISHED');
  });

  // ==========================================
  // 3. Company Management & Ownership Enforcement
  // ==========================================
  it('TC-INT-07: Company A can list all its own opportunities (drafts + published) in management console', async () => {
    const res = await request(app)
      .get('/api/internships/manage')
      .set('Authorization', `Bearer ${companyAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.opportunities.length >= 2);
    assert.ok(res.body.data.stats.totalCount >= 2);
    assert.ok(res.body.data.stats.draftCount >= 1);
    assert.ok(res.body.data.stats.publishedCount >= 1);
  });

  it('TC-INT-08: Security - Company B cannot edit or delete Company A opportunity (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/internships/${createdDraftId}`)
      .set('Authorization', `Bearer ${companyBToken}`)
      .send({
        title: 'Malicious Overwrite by Company B',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN_OPPORTUNITY_ACCESS');
  });

  it('TC-INT-09: Company A can transition opportunity status through its lifecycle', async () => {
    // Publish draft
    const resPublish = await request(app)
      .patch(`/api/internships/${createdDraftId}/status`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ status: INTERNSHIP_STATUSES.PUBLISHED });

    assert.equal(resPublish.status, 200);
    assert.equal(resPublish.body.data.opportunity.status, INTERNSHIP_STATUSES.PUBLISHED);

    // Close opportunity
    const resClose = await request(app)
      .patch(`/api/internships/${createdDraftId}/status`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ status: INTERNSHIP_STATUSES.CLOSED });

    assert.equal(resClose.status, 200);
    assert.equal(resClose.body.data.opportunity.status, INTERNSHIP_STATUSES.CLOSED);

    // Archive opportunity
    const resArchive = await request(app)
      .patch(`/api/internships/${createdDraftId}/status`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({ status: INTERNSHIP_STATUSES.ARCHIVED });

    assert.equal(resArchive.status, 200);
    assert.equal(resArchive.body.data.opportunity.status, INTERNSHIP_STATUSES.ARCHIVED);
  });

  // ==========================================
  // 4. Coordinator & Institutional Oversight
  // ==========================================
  it('TC-INT-10: Coordinator can edit and manage any company opportunity', async () => {
    const res = await request(app)
      .put(`/api/internships/${createdPublishedId}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        title: 'Frontend React UI/UX Engineer Intern (University Approved)',
        openings: 5,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.opportunity.title, 'Frontend React UI/UX Engineer Intern (University Approved)');
    assert.equal(res.body.data.opportunity.openings, 5);
  });

  // ==========================================
  // 5. Search & Filter Queries
  // ==========================================
  it('TC-INT-11: Public search and filter queries work accurately', async () => {
    const resFilter = await request(app)
      .get('/api/internships?search=React&workMode=hybrid');

    assert.equal(resFilter.status, 200);
    assert.equal(resFilter.body.success, true);
    assert.ok(resFilter.body.data.opportunities.length >= 1);
    assert.equal(resFilter.body.data.opportunities[0].workMode, WORK_MODES.HYBRID);
  });
});
