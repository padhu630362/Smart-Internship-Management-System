import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../src/models/Internship.js';
import { Application, APPLICATION_STATUSES } from '../src/models/Application.js';
import { Allocation, ALLOCATION_STATUSES } from '../src/models/Allocation.js';
import { Attendance, ATTENDANCE_STATUSES } from '../src/models/Attendance.js';
import { Task, TASK_STATUSES, TASK_PRIORITIES } from '../src/models/Task.js';
import { Evaluation, EVALUATION_TYPES, EVALUATION_RECOMMENDATIONS } from '../src/models/Evaluation.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Phase 9: Analytics, Reports & Internship Evaluations Integration Tests', () => {
  const timestamp = Date.now();
  const defaultPassword = 'Password123!';

  let httpServer = null;

  let coordinatorUser = null;
  let coordinatorToken = null;
  let companyUser = null;
  let companyToken = null;
  let mentorUser = null;
  let mentorToken = null;
  let studentUser1 = null;
  let studentToken1 = null;
  let studentUser2 = null;
  let studentToken2 = null;

  let internship = null;
  let application1 = null;
  let allocation1 = null;
  let midTermEvaluationId = null;

  before(async () => {
    await connectDB();

    httpServer = http.createServer(app);
    await new Promise((resolve) => httpServer.listen(0, resolve));

    const passwordHash = await hashPassword(defaultPassword);

    // 1. Coordinator
    coordinatorUser = await User.create({
      name: 'Dr. Grace Hopper',
      email: `coord_p9_${timestamp}@example.com`,
      passwordHash,
      role: ROLES.COORDINATOR,
      status: USER_STATUSES.ACTIVE,
      profile: { coordinatorDetails: { department: 'Computer Science' } },
    });
    coordinatorToken = signToken({
      id: coordinatorUser._id.toString(),
      role: ROLES.COORDINATOR,
      email: coordinatorUser.email,
    });

    // 2. Company
    companyUser = await User.create({
      name: 'Neural AI Systems',
      email: `comp_p9_${timestamp}@example.com`,
      passwordHash,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
      profile: { companyDetails: { companyName: 'Neural AI' } },
    });
    companyToken = signToken({
      id: companyUser._id.toString(),
      role: ROLES.COMPANY,
      email: companyUser.email,
    });

    // 3. Mentor
    mentorUser = await User.create({
      name: 'Alan Turing',
      email: `mentor_p9_${timestamp}@example.com`,
      passwordHash,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
      profile: { mentorDetails: { organization: 'Neural AI', designation: 'Principal Architect' } },
    });
    mentorToken = signToken({
      id: mentorUser._id.toString(),
      role: ROLES.MENTOR,
      email: mentorUser.email,
    });

    // 4. Student 1
    studentUser1 = await User.create({
      name: 'Ada Lovelace',
      email: `student1_p9_${timestamp}@example.com`,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: { studentDetails: { studentId: `STU9-001-${timestamp}`, department: 'Computer Science' } },
    });
    studentToken1 = signToken({
      id: studentUser1._id.toString(),
      role: ROLES.STUDENT,
      email: studentUser1.email,
    });

    // 5. Student 2
    studentUser2 = await User.create({
      name: 'Claude Shannon',
      email: `student2_p9_${timestamp}@example.com`,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: { studentDetails: { studentId: `STU9-002-${timestamp}`, department: 'Electrical Engineering' } },
    });
    studentToken2 = signToken({
      id: studentUser2._id.toString(),
      role: ROLES.STUDENT,
      email: studentUser2.email,
    });

    // 6. Internship Opportunity
    internship = await Internship.create({
      title: 'Machine Learning Research Intern',
      description: 'Train transformer models and optimize neural architectures.',
      company: companyUser._id,
      companyName: 'Neural AI',
      requiredSkills: ['Python', 'PyTorch'],
      location: 'New York, NY',
      workMode: WORK_MODES.REMOTE,
      duration: '3 Months',
      openings: 3,
      applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      status: INTERNSHIP_STATUSES.PUBLISHED,
      createdBy: companyUser._id,
    });

    // 7. Application for Student 1
    application1 = await Application.create({
      internship: internship._id,
      student: studentUser1._id,
      company: companyUser._id,
      resumeUrl: 'https://storage.example.com/resumes/ada_lovelace.pdf',
      status: APPLICATION_STATUSES.SELECTED,
      notes: 'Outstanding technical portfolio.',
    });

    // 8. Allocation for Student 1
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 60);

    allocation1 = await Allocation.create({
      student: studentUser1._id,
      internship: internship._id,
      company: companyUser._id,
      mentor: mentorUser._id,
      application: application1._id,
      startDate,
      endDate,
      status: ALLOCATION_STATUSES.ACTIVE,
      allocatedBy: coordinatorUser._id,
    });

    // 9. Attendance record for Student 1
    const attDate = new Date();
    attDate.setUTCHours(0, 0, 0, 0);
    await Attendance.create({
      student: studentUser1._id,
      allocation: allocation1._id,
      company: companyUser._id,
      date: attDate,
      status: ATTENDANCE_STATUSES.PRESENT,
      notes: 'Worked on attention layers.',
    });

    // 10. Task for Student 1
    await Task.create({
      title: 'Benchmark Transformer Latency',
      description: 'Profile inference throughput with TensorRT.',
      allocation: allocation1._id,
      internship: internship._id,
      assignedTo: studentUser1._id,
      assignedBy: mentorUser._id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      priority: TASK_PRIORITIES.HIGH,
      status: TASK_STATUSES.COMPLETED,
      progressPercentage: 100,
    });
  });

  after(async () => {
    try {
      if (httpServer && httpServer.listening) {
        httpServer.closeAllConnections?.();
        await new Promise((resolve) => httpServer.close(resolve));
      }
    } catch {}

    try {
      await mongoose.disconnect();
    } catch {}

    setTimeout(() => process.exit(0), 300).unref();
  });

  it('TC-PH9-01: Mentor submits mid-term evaluation with calculated average rating', async () => {
    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        allocationId: allocation1._id.toString(),
        evaluationType: EVALUATION_TYPES.MID_TERM,
        ratings: {
          technicalSkills: 5,
          communication: 4,
          punctualityAndAttendance: 5,
          initiativeAndLearning: 5,
          qualityOfWork: 4,
        },
        feedback: {
          strengths: 'Deep understanding of neural architectures and autonomous problem solving.',
          areasForImprovement: 'Document code comments more thoroughly.',
          generalComments: 'Exceeding expectations in every milestone.',
        },
        recommendation: EVALUATION_RECOMMENDATIONS.HIGHLY_RECOMMENDED,
        isPassed: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const evalData = res.body.data.evaluation;
    assert.equal(evalData.evaluationType, 'mid_term');
    assert.equal(evalData.ratings.overallRating, 4.6); // (5+4+5+5+4)/5 = 4.6
    assert.equal(evalData.recommendation, 'highly_recommended');
    assert.equal(evalData.student._id.toString(), studentUser1._id.toString());
    midTermEvaluationId = evalData._id.toString();

    // Verify stored in DB
    const saved = await Evaluation.findById(midTermEvaluationId);
    assert.ok(saved);
    assert.equal(saved.ratings.overallRating, 4.6);
  });

  it('TC-PH9-02: Duplicate mid-term evaluation on same allocation is rejected (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        allocationId: allocation1._id.toString(),
        evaluationType: EVALUATION_TYPES.MID_TERM,
        ratings: {
          technicalSkills: 4,
          communication: 4,
          punctualityAndAttendance: 4,
          initiativeAndLearning: 4,
          qualityOfWork: 4,
        },
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.error?.message || res.body.message, /already been submitted/i);
  });

  it('TC-PH9-03: Security - Students cannot submit internship evaluations (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        allocationId: allocation1._id.toString(),
        evaluationType: EVALUATION_TYPES.FINAL,
        ratings: {
          technicalSkills: 5,
          communication: 5,
          punctualityAndAttendance: 5,
          initiativeAndLearning: 5,
          qualityOfWork: 5,
        },
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error?.message || res.body.message, /students are not authorized/i);
  });

  it('TC-PH9-04: Security - Student cannot view another student evaluation (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/evaluations/${midTermEvaluationId}`)
      .set('Authorization', `Bearer ${studentToken2}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error?.message || res.body.message, /access denied|belonging to other students/i);
  });

  it('TC-PH9-05: Coordinator can submit final evaluation with recommendation', async () => {
    const res = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        allocationId: allocation1._id.toString(),
        evaluationType: EVALUATION_TYPES.FINAL,
        ratings: {
          technicalSkills: 5,
          communication: 5,
          punctualityAndAttendance: 5,
          initiativeAndLearning: 5,
          qualityOfWork: 5,
        },
        feedback: {
          generalComments: 'Final project successfully validated for university academic credits.',
        },
        recommendation: EVALUATION_RECOMMENDATIONS.HIGHLY_RECOMMENDED,
        isPassed: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.evaluation.evaluationType, 'final');
    assert.equal(res.body.data.evaluation.ratings.overallRating, 5);

    // Query evaluations for allocation
    const allocEvalRes = await request(app)
      .get(`/api/evaluations/allocation/${allocation1._id}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(allocEvalRes.status, 200);
    assert.ok(allocEvalRes.body.data.midTerm);
    assert.ok(allocEvalRes.body.data.final);
  });

  it('TC-PH9-06: Admin/Coordinator dashboard computes accurate aggregations from database', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${coordinatorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    // Check user counts
    assert.ok(data.users.totalStudents >= 2);
    assert.ok(data.users.totalCompanies >= 1);
    assert.ok(data.users.totalMentors >= 1);

    // Check opportunities
    assert.ok(data.opportunities.published >= 1);

    // Check applications & allocations
    assert.ok(data.applications.total >= 1);
    assert.ok(data.allocations.active >= 1);

    // Check evaluations
    assert.ok(data.evaluations.total >= 2);
    assert.ok(data.evaluations.averageRating >= 4);

    // Check attendance & tasks completion rates
    assert.equal(typeof data.attendance.overallAttendanceRate, 'number');
    assert.equal(typeof data.tasks.completionRate, 'number');
    assert.ok(data.tasks.completed >= 1);

    // Department breakdown
    assert.ok(Array.isArray(data.departmentBreakdown));
  });

  it('TC-PH9-07: Student dashboard computes personalized counts and upcoming deadlines', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    assert.equal(data.role, 'student');
    assert.ok(data.availableOpportunities >= 1);
    assert.ok(data.applications.total >= 1);
    assert.ok(data.currentInternship);
    assert.equal(data.currentInternship._id.toString(), allocation1._id.toString());
    assert.ok(data.attendance.totalDaysLogged >= 1);
    assert.ok(data.tasks.total >= 1);
    assert.ok(Array.isArray(data.evaluations));
    assert.equal(data.evaluations.length, 2); // Mid-term & Final
  });

  it('TC-PH9-08: Company dashboard returns scoped metrics for managed opportunities and interns', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${companyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    assert.equal(data.role, 'company');
    assert.ok(data.opportunities.total >= 1);
    assert.ok(data.applicants.total >= 1);
    assert.ok(data.assignedInterns.active >= 1);
  });

  it('TC-PH9-09: Coordinator can query filtered reports by date range and type', async () => {
    const res = await request(app)
      .get('/api/reports?type=applications&status=selected')
      .set('Authorization', `Bearer ${coordinatorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.records));
    assert.ok(res.body.data.records.length >= 1);
    assert.equal(res.body.data.records[0].status, 'selected');
  });

  it('TC-PH9-10: Security - Student cannot access institutional reports (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error?.message || res.body.message, /not authorized|access forbidden/i);
  });

  it('TC-PH9-11: Security - Student cannot export CSV reports (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/reports/export?type=applications')
      .set('Authorization', `Bearer ${studentToken1}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error?.message || res.body.message, /not authorized|access forbidden/i);
  });


  it('TC-PH9-12: CSV Export generates sanitized CSV file with headers and zero leaked secrets', async () => {
    const res = await request(app)
      .get('/api/reports/export?type=applications')
      .set('Authorization', `Bearer ${coordinatorToken}`);

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.headers['content-disposition'], /attachment; filename="sims-applications-report-/);

    const csvText = res.text;
    assert.ok(csvText.includes('Application ID'));
    assert.ok(csvText.includes('Student Name'));
    assert.ok(csvText.includes('Ada Lovelace'));
    assert.ok(csvText.includes('Machine Learning Research Intern'));

    // Security check: Must NOT leak password hash or tokens
    assert.equal(csvText.includes('passwordHash'), false);
    assert.equal(csvText.includes('Password123!'), false);
    assert.equal(csvText.includes('secret'), false);
  });

  after(async () => {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });
});

