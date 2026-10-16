import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import app from '../src/app.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Internship, INTERNSHIP_STATUSES, WORK_MODES } from '../src/models/Internship.js';
import { Application, APPLICATION_STATUSES } from '../src/models/Application.js';
import { Allocation, ALLOCATION_STATUSES } from '../src/models/Allocation.js';
import { Attendance, ATTENDANCE_STATUSES, ATTENDANCE_REVIEW_STATUSES } from '../src/models/Attendance.js';
import { Task, TASK_STATUSES, TASK_PRIORITIES } from '../src/models/Task.js';
import { Notification, NOTIFICATION_TYPES } from '../src/models/Notification.js';
import { Conversation, CONVERSATION_TYPES } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { Evaluation, EVALUATION_TYPES, EVALUATION_RECOMMENDATIONS } from '../src/models/Evaluation.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Phase 11: Full System Integration & Regression Testing Suite', () => {
  const timestamp = Date.now();
  const testPassword = 'Password123!';
  let passwordHash;

  // Temp files for resume upload test
  const testPdfPath = path.resolve(process.cwd(), `p11-test-resume-${timestamp}.pdf`);
  const testExePath = path.resolve(process.cwd(), `p11-test-malicious-${timestamp}.exe`);

  // Shared actors across the complete E2E lifecycle
  let adminUser, adminToken;
  let coordinatorUser, coordinatorToken;
  let companyUser, companyToken;
  let mentorUser, mentorToken;
  let student1User, student1Token;
  let student2User, student2Token;
  let outsiderUser, outsiderToken;

  // Created resources through the workflow
  let createdOpportunity;
  let createdApplication;
  let createdAllocation;
  let createdTask;
  let createdAttendance;
  let directConversation;
  let groupConversation;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_internship_db');
    }

    // Prepare dummy files for file-upload testing
    fs.writeFileSync(testPdfPath, '%PDF-1.4 sample PDF resume content for Phase 11 E2E tests');
    fs.writeFileSync(testExePath, 'MZ binary executable content should be rejected');

    passwordHash = await hashPassword(testPassword);

    // 1. Admin Account
    adminUser = await User.create({
      name: 'System Administrator',
      email: `admin_p11_${timestamp}@university.edu`,
      passwordHash,
      role: ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
    });
    adminToken = signToken({ id: adminUser._id.toString(), role: adminUser.role, email: adminUser.email });

    // 2. Coordinator Account
    coordinatorUser = await User.create({
      name: 'Prof. Katherine Johnson',
      email: `coord_p11_${timestamp}@university.edu`,
      passwordHash,
      role: ROLES.COORDINATOR,
      status: USER_STATUSES.ACTIVE,
      profile: { coordinatorDetails: { department: 'Computer Science & Engineering', institution: 'State University' } },
    });
    coordinatorToken = signToken({ id: coordinatorUser._id.toString(), role: coordinatorUser.role, email: coordinatorUser.email });

    // 3. Company Account
    companyUser = await User.create({
      name: 'Quantum Dynamics Inc',
      email: `company_p11_${timestamp}@quantum.io`,
      passwordHash,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
      profile: { companyDetails: { companyName: 'Quantum Dynamics Inc', industry: 'Cloud Computing' } },
    });
    companyToken = signToken({ id: companyUser._id.toString(), role: companyUser.role, email: companyUser.email });

    // 4. Mentor Account
    mentorUser = await User.create({
      name: 'Marcus Vance',
      email: `mentor_p11_${timestamp}@quantum.io`,
      passwordHash,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
      profile: { mentorDetails: { companyName: 'Quantum Dynamics Inc', designation: 'Staff Platform Architect' } },
    });
    mentorToken = signToken({ id: mentorUser._id.toString(), role: mentorUser.role, email: mentorUser.email });

    // 5. Student 1 Account
    student1User = await User.create({
      name: 'Alex Rivera',
      email: `student1_p11_${timestamp}@student.university.edu`,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
    });
    student1Token = signToken({ id: student1User._id.toString(), role: student1User.role, email: student1User.email });

    // 6. Student 2 Account (for isolation/competing tests)
    student2User = await User.create({
      name: 'Jordan Lee',
      email: `student2_p11_${timestamp}@student.university.edu`,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
    });
    student2Token = signToken({ id: student2User._id.toString(), role: student2User.role, email: student2User.email });

    // 7. Outsider Account (unauthorized third-party)
    outsiderUser = await User.create({
      name: 'Rogue Outsider',
      email: `outsider_p11_${timestamp}@unknown.com`,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
    });
    outsiderToken = signToken({ id: outsiderUser._id.toString(), role: outsiderUser.role, email: outsiderUser.email });
  });

  after(async () => {
    // Clean up temporary files
    if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
    if (fs.existsSync(testExePath)) fs.unlinkSync(testExePath);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // =========================================================================
  // WORKFLOW 1: Admin logs in and manages users
  // =========================================================================
  test('WF-01: Admin logs in and performs user governance', async () => {
    // 1. Admin login via authentication endpoint
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: testPassword });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.success, true);
    assert.ok(loginRes.body.data.token);

    // 2. Admin lists users with pagination and search
    const listRes = await request(app)
      .get('/api/users?page=1&limit=10&role=coordinator')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.data.users.length >= 1);
    assert.ok(listRes.body.data.pagination);

    // 3. Admin creates an auxiliary coordinator
    const createRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Auxiliary Coordinator',
        email: `aux_coord_${timestamp}@university.edu`,
        password: testPassword,
        role: ROLES.COORDINATOR,
        profile: { coordinatorDetails: { department: 'Information Systems' } },
      });
    assert.strictEqual(createRes.status, 201);
    const createdUser = createRes.body.data.user || createRes.body.data;
    assert.strictEqual(createdUser.role, ROLES.COORDINATOR);

    // 4. Admin updates user status
    const createdUserId = createdUser.id || createdUser._id;
    const statusRes = await request(app)
      .patch(`/api/users/${createdUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: USER_STATUSES.INACTIVE });
    assert.strictEqual(statusRes.status, 200);


    // 5. Safety Guard: Admin cannot demote or deactivate the last active administrator
    const otherAdmins = await User.find({ role: ROLES.ADMIN, status: USER_STATUSES.ACTIVE, _id: { $ne: adminUser._id } });
    if (otherAdmins.length > 0) {
      await User.updateMany({ role: ROLES.ADMIN, status: USER_STATUSES.ACTIVE, _id: { $ne: adminUser._id } }, { status: USER_STATUSES.INACTIVE });
    }
    const demoteRes = await request(app)
      .put(`/api/users/${adminUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: ROLES.STUDENT });
    assert.strictEqual(demoteRes.status, 400);
    assert.match(demoteRes.body.error?.message || demoteRes.body.message, /last active administrator/i);
    if (otherAdmins.length > 0) {
      await User.updateMany({ _id: { $in: otherAdmins.map((a) => a._id) } }, { status: USER_STATUSES.ACTIVE });
    }
  });


  // =========================================================================
  // WORKFLOW 2: Coordinator publishes an internship opportunity
  // =========================================================================
  test('WF-02: Coordinator creates and publishes an internship opportunity', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + 3);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6);

    // 1. Coordinator creates draft opportunity
    const createRes = await request(app)
      .post('/api/internships')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        title: 'Distributed Systems & Cloud Engineering Internship',
        description: 'Comprehensive 12-week program designing scalable Kubernetes microservices, Kafka event pipelines, and real-time observability telemetry.',
        companyId: companyUser._id.toString(),
        companyName: 'Quantum Dynamics Inc',
        mentor: mentorUser._id.toString(),

        requiredSkills: ['Node.js', 'Distributed Systems', 'MongoDB', 'Docker'],
        eligibility: {
          minCgpa: 7.5,
          allowedDepartments: ['Computer Science & Engineering', 'Software Engineering'],
          allowedGraduationYears: [2026, 2027],
        },
        location: 'Seattle, WA / Hybrid',
        workMode: WORK_MODES.HYBRID,
        openings: 5,
        duration: '12 weeks',
        applicationDeadline: futureDate.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        stipend: {
          amount: 2500,
          currency: 'USD',
          isUnpaid: false,
        },
      });

    assert.strictEqual(createRes.status, 201);
    createdOpportunity = createRes.body.data.opportunity || createRes.body.data.internship || createRes.body.data;
    assert.strictEqual(createdOpportunity.status, INTERNSHIP_STATUSES.DRAFT);

    // 2. Coordinator publishes the opportunity
    const publishRes = await request(app)
      .patch(`/api/internships/${createdOpportunity._id}/status`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ status: INTERNSHIP_STATUSES.PUBLISHED });

    assert.strictEqual(publishRes.status, 200);
    const updatedOpp = publishRes.body.data.opportunity || publishRes.body.data.internship || publishRes.body.data;
    assert.strictEqual(updatedOpp.status, INTERNSHIP_STATUSES.PUBLISHED);


    // 3. Verify opportunity is visible in public directory
    const publicList = await request(app).get('/api/internships?search=Distributed');
    assert.strictEqual(publicList.status, 200);
    const oppList = publicList.body.data.opportunities || publicList.body.data.internships || [];
    const matching = oppList.find((i) => i._id === createdOpportunity._id.toString());
    assert.ok(matching, 'Published internship should appear in public directory search');
  });


  // =========================================================================
  // WORKFLOW 3: Student registers, completes profile, and applies
  // =========================================================================
  test('WF-03: Student completes profile with resume and submits application', async () => {
    // 1. Student updates profile with academic details
    const profileRes = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        phone: '+1-555-0199',
        bio: 'Passionate computer science junior with hands-on experience in backend microservices.',
        studentDetails: {
          studentId: 'CS-2026-904',
          department: 'Computer Science & Engineering',
          course: 'B.S. Computer Science',
          graduationYear: 2026,
          cgpa: 8.9,
          skills: ['Node.js', 'MongoDB', 'Docker', 'Go'],
          githubUrl: 'https://github.com/alexrivera-tech',
        },
      });
    assert.strictEqual(profileRes.status, 200);
    const profileUser = profileRes.body.data.user || profileRes.body.data;
    assert.strictEqual(profileUser.profile.studentDetails.studentId, 'CS-2026-904');



    // 2. Student uploads resume file
    const uploadRes = await request(app)
      .post('/api/users/profile/resume')
      .set('Authorization', `Bearer ${student1Token}`)
      .attach('resume', testPdfPath);
    assert.strictEqual(uploadRes.status, 200);
    assert.ok(uploadRes.body.data.resumeUrl);
    const resumeFileName = uploadRes.body.data.resumeFileName;

    // 3. Student applies to published opportunity
    const applyRes = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        internshipId: createdOpportunity._id.toString(),
        coverLetter: 'I have built distributed streaming pipelines with Node.js and would love to contribute to Quantum Dynamics.',
        resumeReference: resumeFileName,
      });

    assert.strictEqual(applyRes.status, 201);
    createdApplication = applyRes.body.data.application || applyRes.body.data;
    assert.strictEqual(createdApplication.status, APPLICATION_STATUSES.SUBMITTED);
  });

  // =========================================================================
  // WORKFLOW 4: Coordinator/company reviews and updates application
  // =========================================================================
  test('WF-04: Company and coordinator review and advance application to selected', async () => {
    // 1. Company views received applications
    const listRes = await request(app)
      .get(`/api/applications?internshipId=${createdOpportunity._id}`)
      .set('Authorization', `Bearer ${companyToken}`);
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.data.applications.length >= 1);

    // 2. Move from submitted -> under_review
    const reviewRes = await request(app)
      .patch(`/api/applications/${createdApplication._id}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        status: APPLICATION_STATUSES.UNDER_REVIEW,
        reviewNotes: 'Strong GPA and relevant distributed systems portfolio.',
      });
    assert.strictEqual(reviewRes.status, 200);
    const underReviewApp = reviewRes.body.data.application || reviewRes.body.data;
    assert.strictEqual(underReviewApp.status, APPLICATION_STATUSES.UNDER_REVIEW);

    // 3. Move from under_review -> shortlisted
    const shortlistRes = await request(app)
      .patch(`/api/applications/${createdApplication._id}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        status: APPLICATION_STATUSES.SHORTLISTED,
        reviewNotes: 'Shortlisted for technical architecture interview.',
      });
    assert.strictEqual(shortlistRes.status, 200);
    const shortlistedApp = shortlistRes.body.data.application || shortlistRes.body.data;
    assert.strictEqual(shortlistedApp.status, APPLICATION_STATUSES.SHORTLISTED);

    // 4. Move from shortlisted -> selected
    const selectRes = await request(app)
      .patch(`/api/applications/${createdApplication._id}/status`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        status: APPLICATION_STATUSES.SELECTED,
        reviewNotes: 'Technical panel passed with flying colors. Formally selected.',
      });
    assert.strictEqual(selectRes.status, 200);
    const selectedApp = selectRes.body.data.application || selectRes.body.data;
    assert.strictEqual(selectedApp.status, APPLICATION_STATUSES.SELECTED);


    // 5. Student verifies updated status in personal dashboard
    const studentAppsRes = await request(app)
      .get('/api/applications/my')
      .set('Authorization', `Bearer ${student1Token}`);
    assert.strictEqual(studentAppsRes.status, 200);
    const myApp = studentAppsRes.body.data.applications.find((a) => a._id === createdApplication._id.toString());
    assert.strictEqual(myApp.status, APPLICATION_STATUSES.SELECTED);

  });

  // =========================================================================
  // WORKFLOW 5: Selected student is allocated to an internship
  // =========================================================================
  test('WF-05: Student is allocated to internship with conflict prevention', async () => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    // 1. Coordinator creates allocation
    const allocRes = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        studentId: student1User._id.toString(),
        internshipId: createdOpportunity._id.toString(),
        mentorId: mentorUser._id.toString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        notes: 'Assigned to Platform Architecture Core Pod under Mentor Marcus Vance.',
      });

    assert.strictEqual(allocRes.status, 201);
    createdAllocation = allocRes.body.data.allocation || allocRes.body.data;
    assert.strictEqual(createdAllocation.status, ALLOCATION_STATUSES.ACTIVE);

    // 2. Conflict prevention: Second concurrent allocation for the same student is rejected
    const conflictRes = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        studentId: student1User._id.toString(),
        internshipId: createdOpportunity._id.toString(),
        mentorId: mentorUser._id.toString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

    assert.strictEqual(conflictRes.status, 409);
    assert.strictEqual(conflictRes.body.error.code, 'CONFLICTING_ACTIVE_ALLOCATION');
  });

  // =========================================================================
  // WORKFLOW 6: Mentor assigns tasks and reviews progress
  // =========================================================================
  test('WF-06: Mentor assigns task, intern submits progress, mentor completes review', async () => {
    const taskDue = new Date();
    taskDue.setDate(taskDue.getDate() + 7);

    // 1. Mentor assigns task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        title: 'Implement Resilient Circuit Breaker on Kafka Ingestion Pod',
        description: 'Implement exponential backoff retry and circuit breaker logic for incoming high-volume telemetry.',
        assignedTo: student1User._id.toString(),
        internship: createdOpportunity._id.toString(),
        allocationId: createdAllocation._id.toString(),
        priority: TASK_PRIORITIES.HIGH,
        dueDate: taskDue.toISOString(),
      });


    assert.strictEqual(taskRes.status, 201);
    createdTask = taskRes.body.data.task || taskRes.body.data;
    assert.strictEqual(createdTask.status, TASK_STATUSES.TODO);


    // 2. Intern submits progress notes and deliverable link
    const submitRes = await request(app)
      .patch(`/api/tasks/${createdTask._id}/progress`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        progressPercentage: 100,
        submissionNotes: 'All circuit breaker thresholds configured; integration tests passing at 98% coverage.',
        submissionLink: 'https://github.com/quantum-dynamics/telemetry-service/pull/104',
        status: TASK_STATUSES.SUBMITTED,
      });

    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.body.data.task.status, TASK_STATUSES.SUBMITTED);
    assert.strictEqual(submitRes.body.data.task.progressPercentage, 100);

    // 3. Mentor reviews and marks completed
    const reviewRes = await request(app)
      .patch(`/api/tasks/${createdTask._id}/review`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        status: TASK_STATUSES.COMPLETED,
        reviewerFeedback: 'Outstanding implementation with clean fallback error states. Merged into main.',
      });

    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewRes.body.data.task.status, TASK_STATUSES.COMPLETED);
    assert.strictEqual(reviewRes.body.data.task.reviewerFeedback, 'Outstanding implementation with clean fallback error states. Merged into main.');
  });

  // =========================================================================
  // WORKFLOW 7: Intern submits attendance and supervisor approves
  // =========================================================================
  test('WF-07: Intern logs daily attendance and supervisor approves record', async () => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Intern submits daily attendance
    const attendRes = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        allocation: createdAllocation._id.toString(),
        date: today,
        status: ATTENDANCE_STATUSES.PRESENT,
        checkInTime: '09:00',
        checkOutTime: '17:30',
        workSummary: 'Completed Kafka telemetry pull request and sprint planning meeting.',
      });

    assert.strictEqual(attendRes.status, 201);
    createdAttendance = attendRes.body.data.attendance || attendRes.body.data;
    assert.strictEqual(createdAttendance.status, ATTENDANCE_STATUSES.PRESENT);

    // 2. Mentor reviews and approves attendance
    const reviewRes = await request(app)
      .patch(`/api/attendance/${createdAttendance._id}/review`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        reviewStatus: ATTENDANCE_REVIEW_STATUSES.APPROVED,
        reviewNotes: 'Verified present at Seattle campus pod.',
      });

    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewRes.body.data.attendance.reviewStatus, ATTENDANCE_REVIEW_STATUSES.APPROVED);

    // 3. Intern queries attendance history and monthly summary
    const summaryRes = await request(app)
      .get('/api/attendance/summary')
      .set('Authorization', `Bearer ${student1Token}`);
    assert.strictEqual(summaryRes.status, 200);
    assert.ok((summaryRes.body.data.summary?.totalDays || summaryRes.body.data.records?.length) >= 1);
  });


  // =========================================================================
  // WORKFLOW 8: Users receive relevant notifications
  // =========================================================================
  test('WF-08: In-app notifications are persisted, counted, and marked read', async () => {
    // 1. Mentor broadcasts an announcement to students
    const announceRes = await request(app)
      .post('/api/notifications/announcements')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        title: 'Sprint 3 Code Freeze & Architecture Showcase',
        message: 'All pod interns must submit final code walkthrough decks by 4 PM Friday.',
        targetAudience: 'all_students',
      });
    assert.strictEqual(announceRes.status, 201);

    // 2. Student fetches notifications list
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${student1Token}`);
    assert.strictEqual(notifRes.status, 200);
    assert.ok(notifRes.body.data.notifications.length >= 1);
    const targetNotif = notifRes.body.data.notifications[0];

    // 3. Unread count check
    const countRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${student1Token}`);
    assert.strictEqual(countRes.status, 200);
    assert.ok(countRes.body.data.unreadCount >= 1);

    // 4. Mark single notification as read
    const singleRead = await request(app)
      .patch(`/api/notifications/${targetNotif._id}/read`)
      .set('Authorization', `Bearer ${student1Token}`);
    assert.strictEqual(singleRead.status, 200);
    assert.strictEqual(singleRead.body.data.notification.isRead, true);

    // 5. Mark all remaining notifications as read
    const allRead = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${student1Token}`);
    assert.strictEqual(allRead.status, 200);
    assert.strictEqual(allRead.body.data.unreadCount, 0);
  });

  // =========================================================================
  // WORKFLOW 9: Authorized users exchange direct and group messages
  // =========================================================================
  test('WF-09: Real-time chat direct and group messaging with membership security', async () => {
    // 1. Student creates direct conversation with mentor
    const directRes = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: CONVERSATION_TYPES.DIRECT,
        recipientId: mentorUser._id.toString(),
      });
    assert.ok([200, 201].includes(directRes.status));
    directConversation = directRes.body.data.conversation || directRes.body.data;

    // 2. Student sends message to mentor
    const sendRes = await request(app)
      .post(`/api/chat/conversations/${directConversation._id}/messages`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ content: 'Hi Marcus, the circuit breaker pull request is ready for your review.' });
    assert.strictEqual(sendRes.status, 201);
    assert.strictEqual(sendRes.body.data.message.content, 'Hi Marcus, the circuit breaker pull request is ready for your review.');

    // 3. Mentor reads messages in the conversation
    const messagesRes = await request(app)
      .get(`/api/chat/conversations/${directConversation._id}/messages?page=1&limit=20`)
      .set('Authorization', `Bearer ${mentorToken}`);
    assert.strictEqual(messagesRes.status, 200);
    assert.ok(messagesRes.body.data.messages.length >= 1);

    // 4. Coordinator creates group conversation
    const groupRes = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        type: CONVERSATION_TYPES.GROUP,
        name: 'Pod Alpha — Architecture Engineering',
        participantIds: [student1User._id.toString(), mentorUser._id.toString()],
      });
    assert.strictEqual(groupRes.status, 201);
    groupConversation = groupRes.body.data.conversation || groupRes.body.data;

    // 5. Security Guard: Rogue outsider cannot read or send messages in group
    const eavesdropRes = await request(app)
      .get(`/api/chat/conversations/${groupConversation._id}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    assert.strictEqual(eavesdropRes.status, 403);
    assert.match(eavesdropRes.body.error?.message || eavesdropRes.body.message, /not a member/i);

    const postSpamRes = await request(app)
      .post(`/api/chat/conversations/${groupConversation._id}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ content: 'Unauthorized intrusion attempt.' });
    assert.strictEqual(postSpamRes.status, 403);
  });

  // =========================================================================
  // WORKFLOW 10: Evaluations and reports reflect persisted database data
  // =========================================================================
  test('WF-10: Evaluations, analytics dashboards, and institutional reports reflect live data', async () => {
    // 1. Mentor submits mid-term evaluation
    const midTermRes = await request(app)
      .post('/api/evaluations')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        allocationId: createdAllocation._id.toString(),
        evaluationType: EVALUATION_TYPES.MID_TERM,
        ratings: {
          technicalSkills: 5,
          communication: 4,
          punctualityAndAttendance: 5,
          initiativeAndLearning: 5,
          qualityOfWork: 4,
        },
        strengths: 'Exceptional grasp of concurrency, event streaming, and resilient architecture.',
        areasOfImprovement: 'Continue refining documentation diagrams for non-technical stakeholders.',
        comments: 'Consistently performs at or above the level of full-time junior engineers.',
      });

    assert.strictEqual(midTermRes.status, 201);
    assert.strictEqual(midTermRes.body.data.evaluation.evaluationType, EVALUATION_TYPES.MID_TERM);
    assert.strictEqual(midTermRes.body.data.evaluation.ratings.overallRating, 4.6);



    // 2. Coordinator views evaluations for the allocation
    const evalListRes = await request(app)
      .get(`/api/evaluations/allocation/${createdAllocation._id}`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    assert.strictEqual(evalListRes.status, 200);
    assert.ok(evalListRes.body.data.evaluations.length >= 1);

    // 3. Analytics Dashboard computes accurate aggregations
    const dashRes = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(dashRes.status, 200);
    assert.ok(dashRes.body.data.users.totalStudents >= 1);
    assert.ok(dashRes.body.data.opportunities.total >= 1);
    assert.ok(dashRes.body.data.allocations.total >= 1);


    // 4. Institutional report filtering
    const reportRes = await request(app)
      .get('/api/reports?type=applications&status=selected')
      .set('Authorization', `Bearer ${coordinatorToken}`);
    assert.strictEqual(reportRes.status, 200);
    assert.ok(reportRes.body.data.records.length >= 1);

    // 5. CSV Export produces properly formatted file with zero leaked credentials
    const exportRes = await request(app)
      .get('/api/reports/export?type=applications')
      .set('Authorization', `Bearer ${coordinatorToken}`);
    assert.strictEqual(exportRes.status, 200);
    assert.match(exportRes.headers['content-type'], /text\/csv/);
    const csvContent = exportRes.text;
    assert.ok(csvContent.includes('Application ID'));
    assert.ok(csvContent.includes('Alex Rivera'));
    assert.strictEqual(csvContent.includes('passwordHash'), false);
    assert.strictEqual(csvContent.includes(testPassword), false);
  });

  // =========================================================================
  // NEGATIVE TESTS & REGRESSION BOUNDARIES
  // =========================================================================
  describe('Negative & Security Boundary Regressions', () => {
    test('NEG-01: Authentication fails on invalid password and non-existent account', async () => {
      // Wrong password
      const badPw = await request(app)
        .post('/api/auth/login')
        .send({ email: student1User.email, password: 'WrongPassword999!' });
      assert.strictEqual(badPw.status, 401);
      assert.strictEqual(badPw.body.error.code, 'INVALID_CREDENTIALS');

      // Non-existent email
      const badEmail = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost_nonexistent_user@nobody.com', password: testPassword });
      assert.strictEqual(badEmail.status, 401);
    });

    test('NEG-02: Deactivated or suspended account is strictly blocked from login and API access', async () => {
      const disabledUser = await User.create({
        name: 'Disabled User',
        email: `disabled_${timestamp}@test.edu`,
        passwordHash,
        role: ROLES.STUDENT,
        status: USER_STATUSES.INACTIVE,
      });
      const disabledToken = signToken({ id: disabledUser._id.toString(), role: disabledUser.role, email: disabledUser.email });

      // Blocked at login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: disabledUser.email, password: testPassword });
      assert.strictEqual(loginRes.status, 403);
      assert.ok(['ACCOUNT_DEACTIVATED', 'ACCOUNT_INACTIVE'].includes(loginRes.body.error.code));

      // Blocked via token
      const apiRes = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${disabledToken}`);
      assert.strictEqual(apiRes.status, 403);
      assert.ok(['ACCOUNT_DEACTIVATED', 'ACCOUNT_INACTIVE'].includes(apiRes.body.error.code));
    });


    test('NEG-03: Protected endpoints reject requests with missing or corrupted tokens', async () => {
      // No token
      const noToken = await request(app).get('/api/users/profile');
      assert.strictEqual(noToken.status, 401);

      // Corrupted token
      const badToken = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid.corrupted.token.payload');
      assert.strictEqual(badToken.status, 401);
      assert.strictEqual(badToken.body.error.code, 'INVALID_TOKEN');
    });

    test('NEG-04: Role & permission checks block unauthorized role operations', async () => {
      // Student cannot create internship
      const studentCreate = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ title: 'Rogue Internship' });
      assert.strictEqual(studentCreate.status, 403);

      // Student cannot access institutional reports
      const reportBlock = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${student1Token}`);
      assert.strictEqual(reportBlock.status, 403);
    });

    test('NEG-05: Company B cannot edit or delete Company A opportunity', async () => {
      const company2 = await User.create({
        name: 'Rival Tech Inc',
        email: `rival_${timestamp}@rival.com`,
        passwordHash,
        role: ROLES.COMPANY,
        status: USER_STATUSES.ACTIVE,
      });
      const company2Token = signToken({ id: company2._id.toString(), role: company2.role, email: company2.email });

      const hijackRes = await request(app)
        .put(`/api/internships/${createdOpportunity._id}`)
        .set('Authorization', `Bearer ${company2Token}`)
        .send({ title: 'Hijacked Title' });

      assert.strictEqual(hijackRes.status, 403);
      assert.match(hijackRes.body.error?.message || hijackRes.body.message, /not authorized/i);
    });

    test('NEG-06: Student cannot download another student resume (IDOR protection)', async () => {
      // Upload resume for Student 2
      const s2Upload = await request(app)
        .post('/api/users/profile/resume')
        .set('Authorization', `Bearer ${student2Token}`)
        .attach('resume', testPdfPath);
      assert.strictEqual(s2Upload.status, 200);
      const s2Filename = s2Upload.body.data.resumeFileName;

      // Student 1 attempts to download Student 2's resume
      const idorRes = await request(app)
        .get(`/api/users/profile/resume/${s2Filename}`)
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(idorRes.status, 403);
      assert.strictEqual(idorRes.body.error.code, 'FORBIDDEN_RESUME_ACCESS');
    });

    test('NEG-07: Duplicate application to the same internship opportunity is rejected', async () => {
      const dupRes = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          internshipId: createdOpportunity._id.toString(),
          coverLetter: 'Duplicate application attempt.',
        });

      assert.strictEqual(dupRes.status, 409);
      assert.strictEqual(dupRes.body.error.code, 'DUPLICATE_APPLICATION');
    });

    test('NEG-08: Duplicate attendance entry on same date is rejected', async () => {
      const today = new Date().toISOString().split('T')[0];

      const dupAttend = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          allocation: createdAllocation._id.toString(),
          date: today,
          status: ATTENDANCE_STATUSES.PRESENT,
        });

      assert.strictEqual(dupAttend.status, 409);
      assert.ok(['DUPLICATE_ATTENDANCE_RECORD', 'DUPLICATE_ATTENDANCE'].includes(dupAttend.body.error.code));
    });


    test('NEG-09: Invalid form data and deadline violations are rejected with 400', async () => {
      // Past deadline
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const pastDeadlineRes = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          title: 'Opportunity with Expired Deadline',
          description: 'This opportunity specifies an application deadline that is already in the past.',
          company: companyUser._id.toString(),
          companyName: 'Quantum Dynamics Inc',
          applicationDeadline: pastDate.toISOString(),
          openings: 2,
        });
      assert.strictEqual(pastDeadlineRes.status, 400);

      // Zero openings
      const zeroOpeningsRes = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          title: 'Opportunity with Zero Openings',
          description: 'This opportunity specifies zero openings which violates positive integer constraint.',
          company: companyUser._id.toString(),
          companyName: 'Quantum Dynamics Inc',
          openings: 0,
        });
      assert.strictEqual(zeroOpeningsRes.status, 400);

      // Malicious executable upload
      const exeRes = await request(app)
        .post('/api/users/profile/resume')
        .set('Authorization', `Bearer ${student1Token}`)
        .attach('resume', testExePath);
      assert.strictEqual(exeRes.status, 400);
      assert.strictEqual(exeRes.body.error.code, 'INVALID_FILE_TYPE');
    });

    test('NEG-10: Empty search queries return graceful empty collections with pagination metadata', async () => {
      const emptyRes = await request(app)
        .get('/api/internships?search=NonExistentKeywordXYZ123456789')
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(emptyRes.status, 200);
      assert.strictEqual(emptyRes.body.success, true);
      const items = emptyRes.body.data.opportunities || emptyRes.body.data.internships || [];
      assert.deepStrictEqual(items, []);
      assert.strictEqual(emptyRes.body.data.pagination.total, 0);
    });


    test('NEG-11: Health diagnostic endpoint reports live database connectivity and uptime', async () => {
      const healthRes = await request(app).get('/api/health');
      assert.strictEqual(healthRes.status, 200);
      assert.strictEqual(healthRes.body.success, true);
      assert.strictEqual(healthRes.body.data.status, 'healthy');
      assert.strictEqual(healthRes.body.data.database.connected, true);
      assert.ok(healthRes.body.data.uptimeSeconds >= 0);
    });
  });
});
