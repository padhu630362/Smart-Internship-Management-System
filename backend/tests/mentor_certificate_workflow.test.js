import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES } from '../src/models/User.js';
import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../src/models/Internship.js';
import { Allocation, ALLOCATION_STATUSES } from '../src/models/Allocation.js';
import { Task, TASK_STATUSES, TASK_PRIORITIES } from '../src/models/Task.js';
import { Certificate, CERTIFICATE_STATUSES } from '../src/models/Certificate.js';
import { signToken } from '../src/utils/jwt.js';

describe('Complete Internship Lifecycle & Mentor-Driven Certificate Issuance Tests', () => {
  const timestamp = Date.now();
  let studentUser;
  let otherStudentUser;
  let companyUser;
  let mentorUser;
  let otherMentorUser;
  let adminUser;

  let studentToken;
  let otherStudentToken;
  let mentorToken;
  let otherMentorToken;
  let adminToken;

  let internshipDoc;
  let allocationDoc;
  let task1;
  let task2;

  const startDate = new Date('2026-01-01T00:00:00Z');
  const endDate = new Date('2026-04-01T00:00:00Z');

  before(async () => {
    await connectDB();

    studentUser = await User.create({
      name: `Alice Walker ${timestamp}`,
      email: `alice_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      status: 'active',
      profile: {
        studentDetails: { studentId: `STU-${timestamp}`, department: 'Informatics' },
      },
    });
    studentToken = signToken({ id: studentUser._id.toString(), role: studentUser.role, email: studentUser.email });

    otherStudentUser = await User.create({
      name: `Bob Smith ${timestamp}`,
      email: `bob_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      status: 'active',
    });
    otherStudentToken = signToken({ id: otherStudentUser._id.toString(), role: otherStudentUser.role, email: otherStudentUser.email });

    companyUser = await User.create({
      name: `Apex Cloud Labs ${timestamp}`,
      email: `apex_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.COMPANY,
      status: 'active',
    });

    mentorUser = await User.create({
      name: `Dr. Alan Turing ${timestamp}`,
      email: `turing_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.MENTOR,
      status: 'active',
      profile: { department: 'Distributed Systems' },
    });
    mentorToken = signToken({ id: mentorUser._id.toString(), role: mentorUser.role, email: mentorUser.email });

    otherMentorUser = await User.create({
      name: `Dr. Rival Mentor ${timestamp}`,
      email: `rival_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.MENTOR,
      status: 'active',
    });
    otherMentorToken = signToken({ id: otherMentorUser._id.toString(), role: otherMentorUser.role, email: otherMentorUser.email });

    adminUser = await User.create({
      name: `Director Admin ${timestamp}`,
      email: `admin_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      status: 'active',
    });
    adminToken = signToken({ id: adminUser._id.toString(), role: adminUser.role, email: adminUser.email });

    internshipDoc = await Internship.create({
      title: `Full-Stack Cloud Engineering ${timestamp}`,
      description: 'Comprehensive software engineering internship covering React, Node.js, and Cloud services.',
      company: companyUser._id,
      companyName: companyUser.name,
      mentor: mentorUser._id,
      workMode: WORK_MODES.REMOTE,
      status: INTERNSHIP_STATUSES.PUBLISHED,
      openings: 5,
      duration: '3 Months',
      location: 'Remote',
      createdBy: companyUser._id,
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    allocationDoc = await Allocation.create({
      student: studentUser._id,
      internship: internshipDoc._id,
      company: companyUser._id,
      mentor: mentorUser._id,
      startDate,
      endDate,
      status: ALLOCATION_STATUSES.ACTIVE,
      allocatedBy: companyUser._id,
      isDemo: false,
      notes: 'Initial placement.',
      completionRequest: {
        status: 'none',
      },
    });

    // Create 2 tasks: 1 in_progress, 1 todo
    task1 = await Task.create({
      title: 'Build Authentication Module',
      description: 'Implement JWT login with bcrypt validation.',
      allocation: allocationDoc._id,
      internship: internshipDoc._id,
      assignedTo: studentUser._id,
      assignedBy: mentorUser._id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: TASK_PRIORITIES.HIGH,
      status: TASK_STATUSES.IN_PROGRESS,
      progressPercentage: 50,
    });

    task2 = await Task.create({
      title: 'API Performance Benchmarking',
      description: 'Profile endpoints with autocannon and log latency.',
      allocation: allocationDoc._id,
      internship: internshipDoc._id,
      assignedTo: studentUser._id,
      assignedBy: mentorUser._id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      priority: TASK_PRIORITIES.MEDIUM,
      status: TASK_STATUSES.TODO,
      progressPercentage: 0,
    });
  });

  after(async () => {
    await Certificate.deleteMany({
      student: { $in: [studentUser?._id, otherStudentUser?._id] },
    });
    await Task.deleteMany({ allocation: allocationDoc?._id });
    await Allocation.deleteMany({
      student: { $in: [studentUser?._id, otherStudentUser?._id] },
    });
    await Internship.deleteMany({ company: companyUser?._id });
    await User.deleteMany({
      _id: {
        $in: [
          studentUser?._id,
          otherStudentUser?._id,
          companyUser?._id,
          mentorUser?._id,
          otherMentorUser?._id,
          adminUser?._id,
        ],
      },
    });
    await mongoose.connection.close();
  });

  it('TC-MCERT-01: Candidate can query completion eligibility metrics for their allocation', async () => {
    const res = await request(app)
      .get(`/api/allocations/${allocationDoc._id}/completion-eligibility`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.eligible, false);
    assert.equal(res.body.data.totalTasks, 2);
    assert.equal(res.body.data.completedTasks, 0);
    assert.equal(res.body.data.pendingTasks.length, 2);
  });

  it('TC-MCERT-02: Student cannot request completion if mandatory tasks are incomplete (400 REQUIREMENTS_NOT_MET)', async () => {
    const res = await request(app)
      .post(`/api/allocations/${allocationDoc._id}/request-completion`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        studentNotes: 'I think I am done.',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'REQUIREMENTS_NOT_MET');
    assert.ok(res.body.data.pendingTasks.length > 0);
  });

  it('TC-MCERT-03: Security - Student cannot request completion on another student allocation (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/allocations/${allocationDoc._id}/request-completion`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({
        studentNotes: 'Hacking attempt.',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('TC-MCERT-04: Student successfully submits completion request with preferred delivery email after tasks approved', async () => {
    // Mentor marks both tasks as completed
    task1.status = TASK_STATUSES.COMPLETED;
    task1.progressPercentage = 100;
    await task1.save();

    task2.status = TASK_STATUSES.COMPLETED;
    task2.progressPercentage = 100;
    await task2.save();

    const customDeliveryEmail = `alice.personal_${timestamp}@gmail.com`;

    const res = await request(app)
      .post(`/api/allocations/${allocationDoc._id}/request-completion`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        studentNotes: 'All project deliverables pushed to Github repository and documentation verified.',
        preferredDeliveryEmail: customDeliveryEmail,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.completionRequest.status, 'pending');
    assert.equal(res.body.data.completionRequest.preferredDeliveryEmail, customDeliveryEmail);
  });

  it('TC-MCERT-05: Security - Unauthorized mentor cannot review completion request (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/allocations/${allocationDoc._id}/review-completion`)
      .set('Authorization', `Bearer ${otherMentorToken}`)
      .send({
        decision: 'approved',
        feedback: 'Unauthorized approval.',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('TC-MCERT-06: Assigned mentor reviews and approves completion request', async () => {
    const res = await request(app)
      .post(`/api/allocations/${allocationDoc._id}/review-completion`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        decision: 'approved',
        feedback: 'Outstanding technical contributions and exemplary diligence throughout the internship.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.completionRequest.status, 'approved');
  });

  it('TC-MCERT-07: Mentor can preview certificate layout and recipient before official issuance', async () => {
    const res = await request(app)
      .get(`/api/certificates/allocation/${allocationDoc._id}/preview`)
      .set('Authorization', `Bearer ${mentorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.studentName, studentUser.name);
    assert.equal(res.body.data.internshipTitle, internshipDoc.title);
    assert.equal(res.body.data.completionStatus, 'approved');
    assert.equal(res.body.data.alreadyIssued, false);
  });

  it('TC-MCERT-08: Security - Student cannot issue their own certificate (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/certificates/allocation/${allocationDoc._id}/issue`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  let issuedCertNumber;
  let issuedVerificationCode;

  it('TC-MCERT-09: Mentor officially issues certificate with preferred delivery email', async () => {
    const customEmail = `alice.personal_${timestamp}@gmail.com`;

    const res = await request(app)
      .post(`/api/certificates/allocation/${allocationDoc._id}/issue`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        deliveryEmail: customEmail,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.certificate);
    assert.equal(res.body.data.certificate.status, CERTIFICATE_STATUSES.ISSUED);
    assert.equal(res.body.data.certificate.deliveryEmail, customEmail);
    assert.equal(res.body.data.certificate.issuedBy.toString(), mentorUser._id.toString());
    assert.equal(res.body.data.certificate.issuedByRole, 'mentor');

    issuedCertNumber = res.body.data.certificate.certificateNumber;
    issuedVerificationCode = res.body.data.certificate.verificationCode;
  });

  it('TC-MCERT-10: Idempotency guard - Re-issuing for the same allocation returns existing certificate without duplicates', async () => {
    const res = await request(app)
      .post(`/api/certificates/allocation/${allocationDoc._id}/issue`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.certificate.certificateNumber, issuedCertNumber);

    // Verify exactly one certificate exists in DB for this allocation
    const count = await Certificate.countDocuments({ allocation: allocationDoc._id });
    assert.equal(count, 1);
  });

  it('TC-MCERT-11: Public credential verification endpoint validates issued certificate and returns sanitized data', async () => {
    const res = await request(app).get(`/api/certificates/verify/${issuedVerificationCode}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.valid, true);
    assert.equal(res.body.data.certificateNumber, issuedCertNumber);
    assert.equal(res.body.data.studentName, studentUser.name);
    // Student email should NOT be exposed in public verification
    assert.equal(res.body.data.studentEmail, undefined);
  });

  it('TC-MCERT-12: Admin audit dashboard endpoint /api/certificates/admin/audit computes summary KPIs and filters', async () => {
    const res = await request(app)
      .get('/api/certificates/admin/audit?type=all')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.summary);
    assert.ok(res.body.data.summary.totalCertificates >= 1);
    assert.ok(res.body.data.summary.totalStudentsCertified >= 1);
    assert.ok(res.body.data.summary.totalMentorsIssued >= 1);
    assert.ok(Array.isArray(res.body.data.certificates));
  });

  it('TC-MCERT-13: Admin mentor stats endpoint /api/certificates/admin/mentor-stats returns mentor issuance counts', async () => {
    const res = await request(app)
      .get('/api/certificates/admin/mentor-stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.mentors));

    const mentorEntry = res.body.data.mentors.find((m) => m.mentorId.toString() === mentorUser._id.toString());
    assert.ok(mentorEntry);
    assert.ok(mentorEntry.totalIssued >= 1);
  });

  it('TC-MCERT-14: Admin endpoint /api/certificates/admin/seed-demo seeds NovaTech Demo Labs workflow with 3 tasks', async () => {
    const res = await request(app)
      .post('/api/certificates/admin/seed-demo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'default' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.student);
    assert.ok(res.body.data.mentor);
    assert.ok(res.body.data.allocation);
    assert.equal(res.body.data.tasks.length, 3);
  });
});
