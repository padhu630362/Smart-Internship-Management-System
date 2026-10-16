import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';

describe('Phase 12: 2FA, Session Management & RBAC Route Protection Tests', () => {
  const timestamp = Date.now();
  const testUserEmail = `test_2fa_session_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  let testUser = null;
  let userToken = null;
  let secondarySessionToken = null;
  let secondarySessionId = null;

  before(async () => {
    await connectDB();

    // Register test user
    const res = await request(app)
      .post('/api/auth/register')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      .send({
        name: 'TwoFactor TestUser',
        email: testUserEmail,
        password: testPassword,
        role: ROLES.STUDENT,
      });

    assert.equal(res.status, 201);
    testUser = res.body.data.user;
    userToken = res.body.data.token;

    // Simulate login from a second device/browser
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
      .send({
        email: testUserEmail,
        password: testPassword,
      });

    assert.equal(loginRes.status, 200);
    secondarySessionToken = loginRes.body.data.token;
  });

  after(async () => {
    try {
      if (testUser?._id) {
        await Session.deleteMany({ user: testUser._id });
        await User.deleteOne({ _id: testUser._id });
      }
    } catch {
      // Ignore cleanup error
    } finally {
      await mongoose.disconnect();
    }
  });

  // ==========================================
  // 1. Session Management Endpoints
  // ==========================================
  it('TC-SESS-01: User can list active login sessions with device and browser metadata', async () => {
    const res = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.sessions));
    assert.ok(res.body.data.sessions.length >= 2, 'Should have at least primary and secondary sessions');

    // Current session check
    const currentSession = res.body.data.sessions.find((s) => s.isCurrent === true);
    assert.ok(currentSession, 'Must identify current session');
    assert.equal(currentSession.deviceType, 'Desktop');
    assert.ok(currentSession.browser.includes('Chrome'));
    assert.ok(currentSession.os.includes('Windows'));

    // Find the secondary session for subsequent revocation test
    const secondary = res.body.data.sessions.find((s) => s.isCurrent === false);
    assert.ok(secondary, 'Should find secondary session');
    secondarySessionId = secondary.id || secondary.sessionId;
    assert.equal(secondary.deviceType, 'Mobile');
    assert.ok(secondary.browser.includes('Safari'));
    assert.ok(secondary.os.includes('iOS'));
  });

  it('TC-SESS-02: User can selectively revoke a specific active session', async () => {
    assert.ok(secondarySessionId, 'Secondary session ID must exist');

    const revokeRes = await request(app)
      .delete(`/api/auth/sessions/${secondarySessionId}`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(revokeRes.status, 200);
    assert.equal(revokeRes.body.success, true);
    assert.ok(revokeRes.body.message.includes('revoked'));

    // Verify revoked session cannot access protected APIs anymore
    const rejectedRes = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${secondarySessionToken}`);

    assert.equal(rejectedRes.status, 401);
    assert.equal(rejectedRes.body.error.code, 'SESSION_REVOKED');
  });

  it('TC-SESS-03: User can revoke all other sessions at once', async () => {
    // Create another session
    const anotherLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: testUserEmail, password: testPassword });
    assert.equal(anotherLogin.status, 200);
    const extraToken = anotherLogin.body.data.token;

    // Revoke all other sessions
    const revokeAllRes = await request(app)
      .post('/api/auth/sessions/revoke-others')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(revokeAllRes.status, 200);
    assert.equal(revokeAllRes.body.success, true);

    // Extra token is now revoked
    const rejectedRes = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${extraToken}`);

    assert.equal(rejectedRes.status, 401);
    assert.equal(rejectedRes.body.error.code, 'SESSION_REVOKED');

    // Primary token remains completely valid
    const primaryValidRes = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(primaryValidRes.status, 200);
  });

  // ==========================================
  // 2. Two-Factor Authentication (2FA) Lifecycle
  // ==========================================
  it('TC-2FA-01: Initial 2FA status is disabled', async () => {
    const res = await request(app)
      .get('/api/auth/2fa/status')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.twoFactorEnabled, false);
  });

  it('TC-2FA-02: Requesting 2FA activation generates OTP and enforces verification', async () => {
    const res = await request(app)
      .post('/api/auth/2fa/enable-request')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.message.includes('dispatched'));

    // Retrieve the user from DB to obtain the 2FA code for testing
    const userInDb = await User.findById(testUser._id).select('+twoFactorCode');
    assert.ok(userInDb.twoFactorCode, 'Hashed 2FA OTP code must be stored in database');

    // Wrong OTP is rejected
    const wrongRes = await request(app)
      .post('/api/auth/2fa/enable-confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: '000000' });

    assert.equal(wrongRes.status, 400);
    assert.equal(wrongRes.body.success, false);
    assert.equal(wrongRes.body.error.code, 'INVALID_CODE');

    // If devCode is returned in test environment, use it to confirm
    const codeToConfirm = res.body.devCode;
    assert.ok(codeToConfirm, 'devCode provided in test environment');

    const confirmRes = await request(app)
      .post('/api/auth/2fa/enable-confirm')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: codeToConfirm });

    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.body.success, true);
    assert.equal(confirmRes.body.data.twoFactorEnabled, true);

    // Verify status endpoint reflects enabled state
    const statusRes = await request(app)
      .get('/api/auth/2fa/status')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(statusRes.body.data.twoFactorEnabled, true);
  });

  it('TC-2FA-03: Login with 2FA enabled returns OTP challenge requiring verification', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUserEmail,
        password: testPassword,
      });

    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.success, true);
    assert.equal(loginRes.body.requiresTwoFactor, true);
    assert.equal(loginRes.body.token, undefined, 'Full session token must NOT be returned until 2FA completes');

    const otpCode = loginRes.body.devCode;
    assert.ok(otpCode, 'OTP code provided in test environment');

    // Invalid OTP is rejected
    const badVerifyRes = await request(app)
      .post('/api/auth/login-verify-2fa')
      .send({
        email: testUserEmail,
        code: '999999',
      });

    assert.equal(badVerifyRes.status, 400);
    assert.equal(badVerifyRes.body.error.code, 'INVALID_CODE');

    // Valid OTP completes login and returns full session token
    const goodVerifyRes = await request(app)
      .post('/api/auth/login-verify-2fa')
      .send({
        email: testUserEmail,
        code: otpCode,
      });

    assert.equal(goodVerifyRes.status, 200);
    assert.equal(goodVerifyRes.body.success, true);
    assert.ok(goodVerifyRes.body.data.token, 'Full session token must be issued upon 2FA success');
    assert.equal(goodVerifyRes.body.data.user.email, testUserEmail);

    // Update userToken with newly authenticated session token
    userToken = goodVerifyRes.body.data.token;
  });

  it('TC-2FA-04: User can disable 2FA with valid password confirmation', async () => {
    // Wrong password rejected
    const wrongPassRes = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ password: 'WrongPassword999!' });

    assert.equal(wrongPassRes.status, 401);
    assert.equal(wrongPassRes.body.error.code, 'INVALID_PASSWORD');

    // Correct password disables 2FA
    const disableRes = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ password: testPassword });

    assert.equal(disableRes.status, 200);
    assert.equal(disableRes.body.success, true);
    assert.equal(disableRes.body.data.twoFactorEnabled, false);

    // Subsequent status check confirms disabled
    const statusRes = await request(app)
      .get('/api/auth/2fa/status')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(statusRes.body.data.twoFactorEnabled, false);
  });

  // ==========================================
  // 3. Route Protection & Role-Based Authorization
  // ==========================================
  it('TC-RBAC-01: Unauthenticated request to protected endpoints is rejected with 401', async () => {
    const res = await request(app).get('/api/users/profile');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('TC-RBAC-02: Student is forbidden from accessing Admin-only routes (403)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('TC-RBAC-03: Student is forbidden from creating internships (Company-only, 403)', async () => {
    const res = await request(app)
      .post('/api/internships')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Unauthorized Internship Posting',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('TC-RBAC-04: Logout invalidates the active session immediately', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    // After logout, token must be rejected with 401 SESSION_REVOKED
    const accessRes = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(accessRes.status, 401);
    assert.equal(accessRes.body.error.code, 'SESSION_REVOKED');
  });
});
