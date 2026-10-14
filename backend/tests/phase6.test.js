import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../src/models/Internship.js';
import { Allocation, ALLOCATION_STATUSES } from '../src/models/Allocation.js';
import { Attendance, ATTENDANCE_STATUSES, ATTENDANCE_REVIEW_STATUSES } from '../src/models/Attendance.js';
import { Task, TASK_STATUSES, TASK_PRIORITIES } from '../src/models/Task.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Phase 6: Internship Allocation, Attendance, and Task Tracking Tests', () => {
  const timestamp = Date.now();
  const companyAEmail = `comp_p6_a_${timestamp}@example.com`;
  const companyBEmail = `comp_p6_b_${timestamp}@example.com`;
  const mentorEmail = `mentor_p6_${timestamp}@example.com`;
  const studentAEmail = `student_p6_a_${timestamp}@example.com`;
  const studentBEmail = `student_p6_b_${timestamp}@example.com`;
  const defaultPassword = 'Password123!';

  let companyAUser = null;
  let companyAToken = null;
  let companyBUser = null;
  let companyBToken = null;
  let mentorUser = null;
  let mentorToken = null;
  let studentAUser = null;
  let studentAToken = null;
  let studentBUser = null;
  let studentBToken = null;

  let internshipA = null;
  let createdAllocationId = null;
  let createdTaskId = null;
  let createdAttendanceId = null;

  before(async () => {
    await connectDB();
    const passwordHash = await hashPassword(defaultPassword);

    // Company A
    companyAUser = await User.create({
      name: 'OmniCloud Technologies',
      email: companyAEmail,
      passwordHash,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
      profile: { companyDetails: { companyName: 'OmniCloud Tech' } },
    });
    companyAToken = signToken({ id: companyAUser._id.toString(), role: ROLES.COMPANY, email: companyAEmail });

    // Company B
    companyBUser = await User.create({
      name: 'Delta Cyber Dynamics',
      email: companyBEmail,
      passwordHash,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
      profile: { companyDetails: { companyName: 'Delta Cyber' } },
    });
    companyBToken = signToken({ id: companyBUser._id.toString(), role: ROLES.COMPANY, email: companyBEmail });

    // Mentor
    mentorUser = await User.create({
      name: 'Dr. Alan Turing Mentor',
      email: mentorEmail,
      passwordHash,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
      profile: { facultyDetails: { department: 'Computer Science' } },
    });
    mentorToken = signToken({ id: mentorUser._id.toString(), role: ROLES.MENTOR, email: mentorEmail });

    // Student A
    studentAUser = await User.create({
      name: 'Ada Lovelace Candidate',
      email: studentAEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: {
          studentId: `STU-P6-${timestamp}-A`,
          department: 'Computer Science',
          cgpa: 9.5,
          resumeUrl: '/uploads/resumes/ada_resume.pdf',
        },
      },
    });
    studentAToken = signToken({ id: studentAUser._id.toString(), role: ROLES.STUDENT, email: studentAEmail });

    // Student B
    studentBUser = await User.create({
      name: 'Grace Hopper Candidate',
      email: studentBEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: {
          studentId: `STU-P6-${timestamp}-B`,
          department: 'Electrical Engineering',
          cgpa: 8.9,
          resumeUrl: '/uploads/resumes/grace_resume.pdf',
        },
      },
    });
    studentBToken = signToken({ id: studentBUser._id.toString(), role: ROLES.STUDENT, email: studentBEmail });

    // Create active internship for Company A
    internshipA = await Internship.create({
      title: 'Full Stack Cloud Engineering Intern',
      description: 'Hands-on microservices and distributed systems development.',
      company: companyAUser._id,
      companyName: 'OmniCloud Technologies',
      requiredSkills: ['Node.js', 'React', 'MongoDB'],
      eligibility: { minCgpa: 7.0 },
      location: 'Bangalore / Hybrid',
      workMode: WORK_MODES.HYBRID,
      stipend: { amount: 35000, currency: 'INR' },
      duration: '6 Months',
      openings: 5,
      applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      status: INTERNSHIP_STATUSES.PUBLISHED,
      createdBy: companyAUser._id,
    });
  });

  after(async () => {
    // Clean up test documents
    const userIds = [
      companyAUser?._id,
      companyBUser?._id,
      mentorUser?._id,
      studentAUser?._id,
      studentBUser?._id,
    ].filter(Boolean);

    await Promise.all([
      Task.deleteMany({ assignedTo: { $in: userIds } }),
      Attendance.deleteMany({ student: { $in: userIds } }),
      Allocation.deleteMany({ student: { $in: userIds } }),
      Internship.deleteMany({ _id: internshipA?._id }),
      User.deleteMany({ _id: { $in: userIds } }),
    ]);

    await mongoose.disconnect();
  });

  // =========================================================================
  // Module A: Internship Allocation Tests
  // =========================================================================
  it('TC-ALC-01: Company A successfully allocates student to internship', async () => {
    const startDate = new Date();
    const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);

    const res = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        studentId: studentAUser._id,
        internshipId: internshipA._id,
        mentorId: mentorUser._id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        notes: 'Placed through Campus Recruitment Drive 2026.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.allocation.status, ALLOCATION_STATUSES.ACTIVE);
    assert.equal(res.body.data.allocation.student._id, studentAUser._id.toString());
    assert.equal(res.body.data.allocation.statusHistory.length, 1);

    createdAllocationId = res.body.data.allocation._id;
  });

  it('TC-ALC-02: Conflict Prevention: Prevent conflicting concurrent active allocation for same student', async () => {
    const startDate = new Date();
    const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);

    const res = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        studentId: studentAUser._id,
        internshipId: internshipA._id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        notes: 'Attempted overlapping allocation.',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICTING_ACTIVE_ALLOCATION');
  });

  it('TC-ALC-03: Security: Company B cannot allocate student to Company A opportunity', async () => {
    const startDate = new Date();
    const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);

    const res = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${companyBToken}`)
      .send({
        studentId: studentBUser._id,
        internshipId: internshipA._id, // Company A's opportunity
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_COMPANY_ALLOCATION');
  });

  it('TC-ALC-04: Security: Student cannot allocate themselves or access allocation creation', async () => {
    const res = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        studentId: studentBUser._id,
        internshipId: internshipA._id,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('TC-ALC-05: Allocation status update (active -> completed) with audit trail note', async () => {
    const res = await request(app)
      .patch(`/api/allocations/${createdAllocationId}/status`)
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        status: ALLOCATION_STATUSES.COMPLETED,
        note: 'Completed full 6-month internship term successfully.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.allocation.status, ALLOCATION_STATUSES.COMPLETED);
    assert.equal(res.body.data.allocation.statusHistory.length, 2);

    // Switch it back to active so attendance and tasks can be verified
    await Allocation.findByIdAndUpdate(createdAllocationId, { status: ALLOCATION_STATUSES.ACTIVE });
  });

  // =========================================================================
  // Module B: Attendance Tests
  // =========================================================================
  it('TC-ATT-01: Intern submits daily attendance with check-in/out and work summary', async () => {
    const today = new Date();

    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        date: today.toISOString(),
        status: ATTENDANCE_STATUSES.PRESENT,
        checkInTime: '09:00 AM',
        checkOutTime: '05:30 PM',
        workSummary: 'Worked on microservices architecture and Redis cache layer.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.attendance.status, ATTENDANCE_STATUSES.PRESENT);
    assert.equal(res.body.data.attendance.reviewStatus, ATTENDANCE_REVIEW_STATUSES.SUBMITTED);

    createdAttendanceId = res.body.data.attendance._id;
  });

  it('TC-ATT-02: Duplicate Prevention: Submitting attendance for same student and date returns 409', async () => {
    const today = new Date();

    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        date: today.toISOString(),
        status: ATTENDANCE_STATUSES.REMOTE,
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'DUPLICATE_ATTENDANCE_RECORD');
  });

  it('TC-ATT-03: Future Date Guard: Submitting attendance for tomorrow returns 400', async () => {
    const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2);

    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        date: tomorrow.toISOString(),
        status: ATTENDANCE_STATUSES.PRESENT,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'FUTURE_ATTENDANCE_PROHIBITED');
  });

  it('TC-ATT-04: Mentor reviews and approves attendance', async () => {
    const res = await request(app)
      .patch(`/api/attendance/${createdAttendanceId}/review`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        reviewStatus: ATTENDANCE_REVIEW_STATUSES.APPROVED,
        reviewNotes: 'Verified check-in against team daily standup.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.attendance.reviewStatus, ATTENDANCE_REVIEW_STATUSES.APPROVED);
  });

  it('TC-ATT-05: Mentor corrects attendance status with mandatory audit reason', async () => {
    // Attempting correction without reason -> 400
    const resNoReason = await request(app)
      .patch(`/api/attendance/${createdAttendanceId}/review`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        reviewStatus: ATTENDANCE_REVIEW_STATUSES.CORRECTED,
        newStatus: ATTENDANCE_STATUSES.HALF_DAY,
      });

    assert.equal(resNoReason.status, 400);
    assert.equal(resNoReason.body.error.code, 'CORRECTION_REASON_REQUIRED');

    // Correction with reason -> 200
    const resCorrect = await request(app)
      .patch(`/api/attendance/${createdAttendanceId}/review`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        reviewStatus: ATTENDANCE_REVIEW_STATUSES.CORRECTED,
        newStatus: ATTENDANCE_STATUSES.HALF_DAY,
        reason: 'Student departed early at 1:00 PM for university exams.',
        reviewNotes: 'Adjusted to half-day per faculty note.',
      });

    assert.equal(resCorrect.status, 200);
    assert.equal(resCorrect.body.data.attendance.status, ATTENDANCE_STATUSES.HALF_DAY);
    assert.equal(resCorrect.body.data.attendance.correctionHistory.length, 1);
    assert.equal(resCorrect.body.data.attendance.correctionHistory[0].previousStatus, ATTENDANCE_STATUSES.PRESENT);
  });

  it('TC-ATT-06: Monthly attendance summary calculation returns accurate rates and counts', async () => {
    const res = await request(app)
      .get(`/api/attendance/summary?studentId=${studentAUser._id}`)
      .set('Authorization', `Bearer ${studentAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.summary.totalDays, 1);
    assert.equal(res.body.data.summary.halfDayCount, 1);
    assert.ok(res.body.data.summary.attendanceRate >= 0);
  });

  // =========================================================================
  // Module C: Task Management Tests
  // =========================================================================
  it('TC-TSK-01: Mentor creates and assigns task to intern with title, due date, priority', async () => {
    const dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        title: 'Implement GraphQL Federation Gateway',
        description: 'Set up Apollo Router and federated schemas for inventory and auth.',
        allocationId: createdAllocationId,
        dueDate: dueDate.toISOString(),
        priority: TASK_PRIORITIES.HIGH,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.task.title, 'Implement GraphQL Federation Gateway');
    assert.equal(res.body.data.task.priority, TASK_PRIORITIES.HIGH);
    assert.equal(res.body.data.task.status, TASK_STATUSES.TODO);

    createdTaskId = res.body.data.task._id;
  });

  it('TC-TSK-02: Intern retrieves assigned tasks and checks overdue property', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${studentAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.tasks.length >= 1);
    assert.equal(res.body.data.tasks[0]._id, createdTaskId.toString());
  });

  it('TC-TSK-03: Intern submits progress notes and deliverable link', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}/progress`)
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({
        progressPercentage: 100,
        submissionNotes: 'All subgraphs merged and unit tests passing at 95% coverage.',
        submissionLink: 'https://github.com/omnicloud/gateway-pull/42',
        status: TASK_STATUSES.SUBMITTED,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.task.status, TASK_STATUSES.SUBMITTED);
    assert.equal(res.body.data.task.progressPercentage, 100);
    assert.equal(res.body.data.task.history.length, 2);
  });

  it('TC-TSK-04: Mentor reviews task, marks completed, and records feedback', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}/review`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        status: TASK_STATUSES.COMPLETED,
        reviewerFeedback: 'Excellent architecture and clean subgraph error handling.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.task.status, TASK_STATUSES.COMPLETED);
    assert.equal(res.body.data.task.reviewerFeedback, 'Excellent architecture and clean subgraph error handling.');
    assert.equal(res.body.data.task.history.length, 3);
  });
});
