import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Internship, INTERNSHIP_STATUSES, WORK_MODES } from '../src/models/Internship.js';
import { Application, APPLICATION_STATUSES } from '../src/models/Application.js';
import { Allocation, ALLOCATION_STATUSES } from '../src/models/Allocation.js';
import { Attendance, ATTENDANCE_STATUSES, ATTENDANCE_REVIEW_STATUSES } from '../src/models/Attendance.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';
import { createRateLimiter } from '../src/middlewares/rateLimiter.js';
import { redactSensitive } from '../src/utils/logger.js';
import { sanitizeObject, escapeRegex } from '../src/middlewares/sanitize.js';

describe('Phase 10: Security, Reliability Hardening & Audit Logging Integration Tests', () => {
  let adminUser, adminToken;
  let mentorUser, mentorToken;
  let student1, student1Token;
  let student2, student2Token;
  let companyUser, companyToken;
  let testInternship, testApplication, testAllocation, testAttendance;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_internship_db');
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    // 1. Admin account
    adminUser = await User.create({
      name: 'Security Admin',
      email: `sec_admin_${Date.now()}@university.edu`,
      passwordHash,
      role: ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
    });
    adminToken = signToken({ id: adminUser._id.toString(), role: adminUser.role, email: adminUser.email });

    // 2. Company account
    companyUser = await User.create({
      name: 'Hardened Tech Corp',
      email: `hardened_corp_${Date.now()}@tech.com`,
      passwordHash,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
    });
    companyToken = signToken({ id: companyUser._id.toString(), role: companyUser.role, email: companyUser.email });

    // 3. Mentor account
    mentorUser = await User.create({
      name: 'Hardened Mentor',
      email: `mentor_sec_${Date.now()}@tech.com`,
      passwordHash,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
    });
    mentorToken = signToken({ id: mentorUser._id.toString(), role: mentorUser.role, email: mentorUser.email });

    // 4. Student 1 account
    student1 = await User.create({
      name: 'Protected Student One',
      email: `student_sec_1_${Date.now()}@university.edu`,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: {
          department: 'Computer Science',
          studentId: 'SEC-001',
          resumeUrl: '/uploads/resumes/student1_resume.pdf',
        },
      },
    });
    student1Token = signToken({ id: student1._id.toString(), role: student1.role, email: student1.email });

    // 5. Student 2 account
    student2 = await User.create({
      name: 'Protected Student Two',
      email: `student_sec_2_${Date.now()}@university.edu`,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: {
          department: 'Computer Science',
          studentId: 'SEC-002',
          resumeUrl: '/uploads/resumes/student2_resume.pdf',
        },
      },
    });
    student2Token = signToken({ id: student2._id.toString(), role: student2.role, email: student2.email });

    // 6. Test Opportunity
    testInternship = await Internship.create({
      title: 'Security Engineering Intern',
      description: 'Hands-on cyber defense testing and auditing.',
      company: companyUser._id,
      companyName: companyUser.name,
      mentor: mentorUser._id,
      createdBy: companyUser._id,
      requiredSkills: ['Node.js', 'Cryptography', 'OWASP'],
      eligibility: { minCgpa: 3.0 },
      location: 'Remote',
      workMode: WORK_MODES.REMOTE,
      duration: '3 months',
      openings: 5,
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: INTERNSHIP_STATUSES.PUBLISHED,
    });

    // 7. Test Application
    testApplication = await Application.create({
      internship: testInternship._id,
      student: student1._id,
      company: companyUser._id,
      status: APPLICATION_STATUSES.SUBMITTED,
      studentSnapshot: {
        name: student1.name,
        email: student1.email,
        studentId: 'SEC-001',
        department: 'Computer Science',
      },
      resumeUrl: 'https://storage.university.edu/resumes/student1.pdf',
      statusHistory: [
        {
          status: APPLICATION_STATUSES.SUBMITTED,
          changedBy: student1._id,
          changedByName: student1.name,
          changedAt: new Date(),
          note: 'Application submitted',
        },
      ],
    });

    // 8. Test Allocation
    testAllocation = await Allocation.create({
      student: student1._id,
      internship: testInternship._id,
      company: companyUser._id,
      mentor: mentorUser._id,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-09-01'),
      status: ALLOCATION_STATUSES.ACTIVE,
      allocatedBy: adminUser._id,
    });

    // 9. Test Attendance
    testAttendance = await Attendance.create({
      student: student1._id,
      allocation: testAllocation._id,
      company: companyUser._id,
      date: new Date('2026-06-15'),
      status: ATTENDANCE_STATUSES.PRESENT,
      checkInTime: '09:00',
      checkOutTime: '17:00',
      reviewStatus: ATTENDANCE_REVIEW_STATUSES.PENDING,
    });
  });


  // =========================================================================
  // 1. Deactivated & Suspended Account Handling
  // =========================================================================
  test('TC-PH10-01: Login rejected with 403 when account is deactivated (status: inactive)', async () => {
    // Create deactivated user
    const passwordHash = await hashPassword('Password123!');
    const deactivatedUser = await User.create({
      name: 'Deactivated User',
      email: `deactivated_${Date.now()}@university.edu`,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.INACTIVE,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: deactivatedUser.email, password: 'Password123!' });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'ACCOUNT_DEACTIVATED');

    await User.findByIdAndDelete(deactivatedUser._id);
  });

  test('TC-PH10-02: Authenticated request rejected with 403 when token belongs to deactivated user', async () => {
    const passwordHash = await hashPassword('Password123!');
    const targetUser = await User.create({
      name: 'Active Then Deactivated',
      email: `active_deact_${Date.now()}@university.edu`,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
    });

    // Token issued while user was active
    const token = signToken({ id: targetUser._id.toString(), role: targetUser.role, email: targetUser.email });

    // Request succeeds while active
    const resActive = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(resActive.status, 200);

    // Deactivate user in database
    targetUser.status = USER_STATUSES.INACTIVE;
    await targetUser.save();

    // Subsequent request with the same token is blocked
    const resDeact = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(resDeact.status, 403);
    assert.strictEqual(resDeact.body.success, false);
    assert.strictEqual(resDeact.body.error.code, 'ACCOUNT_DEACTIVATED');

    await User.findByIdAndDelete(targetUser._id);
  });

  // =========================================================================
  // 2. Session Revocation on Password Reset
  // =========================================================================
  test('TC-PH10-03: Password reset revokes prior active sessions (old token becomes invalid)', async () => {
    const initialHash = await hashPassword('OldPassword123!');
    const resetUser = await User.create({
      name: 'Password Reset User',
      email: `reset_user_${Date.now()}@university.edu`,
      passwordHash: initialHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
    });

    // Issue token BEFORE password reset
    const oldToken = signToken({ id: resetUser._id.toString(), role: resetUser.role, email: resetUser.email });

    // Old token works initially
    const resBefore = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${oldToken}`);
    assert.strictEqual(resBefore.status, 200);

    // Step 1: Request password reset
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: resetUser.email });
    assert.strictEqual(forgotRes.status, 200);
    const resetToken = forgotRes.body.devResetToken;
    assert.ok(resetToken, 'Dev reset token should be returned in test mode');

    // Wait 1.1s so token iat is strictly older than passwordChangedAt
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Step 2: Complete password reset
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, newPassword: 'NewPassword999!' });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.body.success, true);

    // Step 3: Old token is now rejected due to passwordChangedAt timestamp check
    const resAfterOldToken = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${oldToken}`);
    assert.strictEqual(resAfterOldToken.status, 401);
    assert.strictEqual(resAfterOldToken.body.error.code, 'TOKEN_EXPIRED');

    // Step 4: Login with new password succeeds
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: resetUser.email, password: 'NewPassword999!' });
    assert.strictEqual(newLoginRes.status, 200);
    assert.ok(newLoginRes.body.data.token);

    await User.findByIdAndDelete(resetUser._id);
  });

  // =========================================================================
  // 3. NoSQL Injection & Prototype Pollution Sanitization
  // =========================================================================
  test('TC-PH10-04: sanitizeObject strips MongoDB operators ($gt, $ne) and prototype pollution keys', () => {
    const maliciousPayload = JSON.parse(
      '{"email":"user@university.edu","password":{"$gt":""},"__proto__":{"isAdmin":true},"nested":{"field.with.dot":"injected","valid":"ok","$where":"this.role == \\"admin\\""}}'
    );

    const sanitized = sanitizeObject(maliciousPayload);

    assert.strictEqual(sanitized.email, 'user@university.edu');
    assert.deepStrictEqual(sanitized.password, {});
    assert.strictEqual(sanitized.isAdmin, undefined);
    assert.strictEqual(sanitized.nested['field.with.dot'], undefined);
    assert.strictEqual(sanitized.nested.$where, undefined);
    assert.strictEqual(sanitized.nested.valid, 'ok');
  });

  // =========================================================================
  // 4. Regex Search Escaping & ReDoS Defense
  // =========================================================================
  test('TC-PH10-05: Regex special characters in search parameters do not crash server', async () => {
    // Send dangerous regex characters (unbalanced parentheses, braces, etc.)
    const res = await request(app)
      .get('/api/internships?search=(unbalanced[regex*+?')
      .set('Authorization', `Bearer ${student1Token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.opportunities));
  });

  test('TC-PH10-06: escapeRegex safely escapes all special characters', () => {
    const raw = 'C++ (Advanced) [Level 1] {All} .*?^$|\\';
    const escaped = escapeRegex(raw);
    assert.doesNotThrow(() => new RegExp(escaped, 'i'));
    assert.strictEqual(new RegExp(escaped, 'i').test(raw), true);
  });

  // =========================================================================
  // 5. Authorization Boundaries & Cross-Student IDOR Prevention
  // =========================================================================
  test('TC-PH10-07: Student cannot download another student\'s resume (403 Forbidden)', async () => {
    // student1 attempts to access student2's resume filename
    const res = await request(app)
      .get('/api/users/profile/resume/student2_resume.pdf')
      .set('Authorization', `Bearer ${student1Token}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN_RESUME_ACCESS');
  });

  test('TC-PH10-08: Student cannot override attendance query by passing other studentId', async () => {
    // student1 requests attendance with student2's ID
    const res = await request(app)
      .get(`/api/attendance?studentId=${student2._id}`)
      .set('Authorization', `Bearer ${student1Token}`);

    assert.strictEqual(res.status, 200);
    // Result records must ONLY contain student1 records
    const records = res.body.data.records;
    for (const rec of records) {
      assert.strictEqual(rec.student._id.toString(), student1._id.toString());
    }
  });

  test('TC-PH10-09: Student cannot override task query by passing other student assignedTo ID', async () => {
    // student1 requests tasks with student2's ID
    const res = await request(app)
      .get(`/api/tasks?assignedTo=${student2._id}`)
      .set('Authorization', `Bearer ${student1Token}`);

    assert.strictEqual(res.status, 200);
    const tasks = res.body.data.tasks;
    for (const task of tasks) {
      assert.strictEqual(task.assignedTo._id.toString(), student1._id.toString());
    }
  });

  // =========================================================================
  // 6. Regulatory & Administrative Management Tests
  // =========================================================================
  test('TC-PH10-10: Admin role change persists new role in MongoDB', async () => {
    await User.updateOne({ _id: adminUser._id }, { $set: { status: USER_STATUSES.ACTIVE, role: ROLES.ADMIN } });
    const roleChangeUser = await User.create({
      name: 'Role Change Target',
      email: `target_role_${Date.now()}@university.edu`,
      passwordHash: await hashPassword('Password123!'),
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
    });

    // Admin promotes student to mentor
    const updateRes = await request(app)
      .put(`/api/users/${roleChangeUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: ROLES.MENTOR });

    assert.strictEqual(updateRes.status, 200);

    // Verify user role was updated directly in MongoDB
    const updatedUser = await User.findById(roleChangeUser._id);
    assert.ok(updatedUser);
    assert.strictEqual(updatedUser.role, ROLES.MENTOR);

    await User.findByIdAndDelete(roleChangeUser._id);
  });

  test('TC-PH10-11: Attendance correction updates review status and attendance status in MongoDB', async () => {
    const reviewRes = await request(app)
      .patch(`/api/attendance/${testAttendance._id}/review`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        reviewStatus: ATTENDANCE_REVIEW_STATUSES.CORRECTED,
        newStatus: ATTENDANCE_STATUSES.HALF_DAY,
        reason: 'Student left early for verified academic exam.',
      });

    assert.strictEqual(reviewRes.status, 200);

    // Verify attendance was updated directly in MongoDB
    const updatedAttendance = await Attendance.findById(testAttendance._id);
    assert.ok(updatedAttendance);
    assert.strictEqual(updatedAttendance.status, ATTENDANCE_STATUSES.HALF_DAY);
    assert.strictEqual(updatedAttendance.reviewStatus, ATTENDANCE_REVIEW_STATUSES.CORRECTED);
    assert.strictEqual(updatedAttendance.correctionHistory[0].reason, 'Student left early for verified academic exam.');
  });

  test('TC-PH10-12: Application decision updates application review status in MongoDB', async () => {
    const decisionRes = await request(app)
      .patch(`/api/applications/${testApplication._id}/status`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        status: APPLICATION_STATUSES.UNDER_REVIEW,
        reviewNotes: 'Impressive cryptography knowledge demonstrated.',
      });

    assert.strictEqual(decisionRes.status, 200);

    // Verify application status was updated directly in MongoDB
    const updatedApp = await Application.findById(testApplication._id);
    assert.ok(updatedApp);
    assert.strictEqual(updatedApp.status, APPLICATION_STATUSES.UNDER_REVIEW);
    assert.strictEqual(updatedApp.reviewNotes, 'Impressive cryptography knowledge demonstrated.');
  });

  test('TC-PH10-13: Audit logs endpoint is cleanly removed (returns 404)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 404);
  });

  // =========================================================================
  // 7. Rate Limiter Functional Behavior & Headers
  // =========================================================================
  test('TC-PH10-14: Rate limiter returns 429 when max requests exceeded with Retry-After header', async () => {
    // Instantiate testable rate limiter with skipInTest: false
    const testLimiter = createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 2,
      skipInTest: false,
      message: 'Test rate limit exceeded.',
    });

    const mockReq = { ip: '192.168.1.100', headers: {} };
    let mockStatus = 200;
    let headersSet = {};
    const mockRes = {
      setHeader: (k, v) => { headersSet[k] = v; },
      status: (s) => { mockStatus = s; return mockRes; },
    };

    let nextErr = null;
    const nextFn = (err) => { nextErr = err || null; };

    // Request 1: Allowed
    testLimiter(mockReq, mockRes, nextFn);
    assert.strictEqual(nextErr, null);
    assert.strictEqual(headersSet['X-RateLimit-Remaining'], 1);

    // Request 2: Allowed
    testLimiter(mockReq, mockRes, nextFn);
    assert.strictEqual(nextErr, null);
    assert.strictEqual(headersSet['X-RateLimit-Remaining'], 0);

    // Request 3: Blocked (429)
    testLimiter(mockReq, mockRes, nextFn);
    assert.ok(nextErr, 'Rate limit error must be passed to next');
    assert.strictEqual(nextErr.statusCode, 429);
    assert.strictEqual(nextErr.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(headersSet['Retry-After'] > 0);
  });

  // =========================================================================
  // 8. Safe Logging Redaction
  // =========================================================================
  test('TC-PH10-15: redactSensitive masks passwords, tokens, and authorization secrets', () => {
    const rawMeta = {
      email: 'admin@sims.edu',
      password: 'PlaintextPassword123',
      passwordHash: 'salt:derivedhash',
      token: 'jwt.token.secret',
      Authorization: 'Bearer secret_token',
      nested: {
        jwt_secret: 'super_secret_key',
        publicField: 'visible_data',
      },
    };

    const redacted = redactSensitive(rawMeta);

    assert.strictEqual(redacted.email, 'admin@sims.edu');
    assert.strictEqual(redacted.password, '***REDACTED***');
    assert.strictEqual(redacted.passwordHash, '***REDACTED***');
    assert.strictEqual(redacted.token, '***REDACTED***');
    assert.strictEqual(redacted.Authorization, '***REDACTED***');
    assert.strictEqual(redacted.nested.jwt_secret, '***REDACTED***');
    assert.strictEqual(redacted.nested.publicField, 'visible_data');
  });

  after(async () => {
    // Clean up created test records
    await Attendance.deleteMany({ allocation: testAllocation?._id });
    await Allocation.deleteMany({ _id: testAllocation?._id });
    await Application.deleteMany({ _id: testApplication?._id });
    await Internship.deleteMany({ _id: testInternship?._id });
    await User.deleteMany({ _id: { $in: [adminUser?._id, companyUser?._id, mentorUser?._id, student1?._id, student2?._id] } });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
});

