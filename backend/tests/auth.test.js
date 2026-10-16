import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES } from '../src/models/User.js';

describe('Phase 2: Authentication and RBAC Integration Tests', () => {
  const timestamp = Date.now();
  const testStudentEmail = `test_student_${timestamp}@example.com`;
  const testCompanyEmail = `test_company_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  let studentToken = null;
  let companyToken = null;
  let adminToken = null;

  before(async () => {
    await connectDB();
  });

  after(async () => {
    // Clean up created test accounts
    try {
      await User.deleteMany({
        email: { $in: [testStudentEmail, testCompanyEmail, `admin_${timestamp}@example.com`] },
      });
    } catch {
      // Ignore cleanup error
    } finally {
      await mongoose.disconnect();
    }
  });

  it('TC-AUTH-01: Should successfully register a new student account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alex Student',
        email: testStudentEmail,
        password: testPassword,
        role: ROLES.STUDENT,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, testStudentEmail);
    assert.equal(res.body.data.user.role, ROLES.STUDENT);
    assert.equal(res.body.data.user.passwordHash, undefined, 'Password hash must never be returned');

    studentToken = res.body.data.token;
  });

  it('TC-AUTH-02: Should successfully register a new company account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Tech Recruiter',
        email: testCompanyEmail,
        password: testPassword,
        role: ROLES.COMPANY,
        profile: {
          companyDetails: { companyName: 'Tech Innovations' },
        },
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, ROLES.COMPANY);
    companyToken = res.body.data.token;
  });

  it('TC-AUTH-03: Security - Should strictly block self-registration as Admin (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Attacker Admin',
        email: `fake_admin_${timestamp}@example.com`,
        password: testPassword,
        role: ROLES.ADMIN,
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'PRIVILEGE_ESCALATION_BLOCKED');
  });

  it('TC-AUTH-04: Security - Should strictly block self-registration as Coordinator (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Attacker Coordinator',
        email: `fake_coord_${timestamp}@example.com`,
        password: testPassword,
        role: ROLES.COORDINATOR,
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'PRIVILEGE_ESCALATION_BLOCKED');
  });

  it('TC-AUTH-05: Should reject duplicate email registration (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Student',
        email: testStudentEmail,
        password: testPassword,
        role: ROLES.STUDENT,
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'DUPLICATE_EMAIL');
  });

  it('TC-AUTH-05B: Should reject duplicate email registration even with uppercase and leading/trailing whitespace (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Case Variant Student',
        email: `  ${testStudentEmail.toUpperCase()}  `,
        password: testPassword,
        role: ROLES.STUDENT,
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'DUPLICATE_EMAIL');
  });

  it('TC-AUTH-06: Should reject registration with weak password (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Weak User',
        email: `weak_${timestamp}@example.com`,
        password: 'short',
        role: ROLES.STUDENT,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('TC-AUTH-07: Should successfully login with valid credentials and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudentEmail,
        password: testPassword,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, testStudentEmail);
    assert.equal(res.body.data.user.passwordHash, undefined);
  });

  it('TC-AUTH-08: Should reject login with invalid password (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudentEmail,
        password: 'WrongPassword999!',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('TC-AUTH-09: Should reject protected /api/auth/me request without token (401 Unauthorized)', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('TC-AUTH-10: Should reject protected request with tampered/invalid token (401 Unauthorized)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.tampered.token');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('TC-AUTH-11: Should allow protected /api/auth/me request with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, testStudentEmail);
  });

  it('TC-AUTH-12: RBAC - Student should access student-only endpoint (200 OK)', async () => {
    const res = await request(app)
      .get('/api/auth/student-access-test')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('TC-AUTH-13: RBAC - Student accessing admin-only endpoint should be denied (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/auth/admin-access-test')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('TC-AUTH-14: RBAC - Company accessing company-only endpoint should succeed (200 OK)', async () => {
    const res = await request(app)
      .get('/api/auth/company-access-test')
      .set('Authorization', `Bearer ${companyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('TC-AUTH-15: Password Reset Flow - Forgot password and reset with verification token', async () => {
    // 1. Request reset token
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testStudentEmail });

    assert.equal(forgotRes.status, 200);
    const devToken = forgotRes.body.devResetToken;
    assert.ok(devToken, 'Dev reset token should be returned in test mode');

    // 2. Perform reset with new password
    const newPassword = 'NewSecretPassword2026!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: devToken,
        newPassword,
      });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);

    // 3. Verify old password fails
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testStudentEmail, password: testPassword });
    assert.equal(oldLoginRes.status, 401);

    // 4. Verify new password succeeds
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testStudentEmail, password: newPassword });
    assert.equal(newLoginRes.status, 200);
    assert.ok(newLoginRes.body.data.token);
  });

  it('TC-AUTH-16: Google Sign-In - Should auto-register a new student via Google credential', async () => {
    const googleEmail = `google_student_${timestamp}@example.com`;
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: `test_google_token_${timestamp}`,
        email: googleEmail,
        name: 'Jordan Google Intern',
        role: ROLES.STUDENT,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, googleEmail);
    assert.equal(res.body.data.user.role, ROLES.STUDENT);
    assert.equal(res.body.data.user.authProvider, 'google');

    // Clean up created google user
    await User.deleteOne({ email: googleEmail });
  });

  it('TC-AUTH-17: Google Sign-In - Should authenticate existing user and preserve role', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: `test_google_token_existing_${timestamp}`,
        email: testStudentEmail,
        name: 'Alex Student',
        role: ROLES.STUDENT,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, testStudentEmail);
  });

  it('TC-AUTH-18: Security - Should reject Google Sign-In without credential token (400)', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'MISSING_CREDENTIAL');
  });
});
