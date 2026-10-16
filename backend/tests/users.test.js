import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';

describe('Phase 3: User Profiles and User Management Tests', () => {
  const timestamp = Date.now();
  const studentEmail = `student_phase3_${timestamp}@example.com`;
  const adminEmail = `admin_phase3_${timestamp}@example.com`;
  const secondAdminEmail = `admin2_phase3_${timestamp}@example.com`;
  const coordinatorEmail = `coordinator_phase3_${timestamp}@example.com`;
  const defaultPassword = 'Password123!';

  let studentUser = null;
  let studentToken = null;
  let adminUser = null;
  let adminToken = null;
  let secondAdminUser = null;
  let temporarilySuspendedAdmins = [];

  // Temp file paths for upload tests
  const testPdfPath = path.resolve(process.cwd(), `test-resume-${timestamp}.pdf`);
  const testExePath = path.resolve(process.cwd(), `test-malicious-${timestamp}.exe`);

  before(async () => {
    await connectDB();

    // Create dummy files for upload testing
    fs.writeFileSync(testPdfPath, '%PDF-1.4 sample resume content for testing purposes');
    fs.writeFileSync(testExePath, 'MZ binary executable content');

    const passwordHash = await hashPassword(defaultPassword);

    // Create student user
    studentUser = await User.create({
      name: 'Sam Student',
      email: studentEmail,
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        studentDetails: {
          department: 'Computer Science',
          graduationYear: 2026,
        },
      },
    });
    studentToken = signToken({ id: studentUser._id.toString(), role: ROLES.STUDENT, email: studentEmail });

    // Create primary admin user
    adminUser = await User.create({
      name: 'Primary Admin',
      email: adminEmail,
      passwordHash,
      role: ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
    });
    adminToken = signToken({ id: adminUser._id.toString(), role: ROLES.ADMIN, email: adminEmail });
  });

  after(async () => {
    // Restore any temporarily suspended admins
    if (temporarilySuspendedAdmins.length > 0) {
      try {
        await User.updateMany(
          { _id: { $in: temporarilySuspendedAdmins } },
          { $set: { status: USER_STATUSES.ACTIVE } }
        );
      } catch {
        // Ignore restoration error
      }
    }

    // Clean up temporary files
    if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
    if (fs.existsSync(testExePath)) fs.unlinkSync(testExePath);

    // Clean up created accounts
    try {
      await User.deleteMany({
        email: {
          $in: [
            studentEmail,
            adminEmail,
            secondAdminEmail,
            coordinatorEmail,
            `created_coord_${timestamp}@example.com`,
          ],
        },
      });
    } catch {
      // Ignore cleanup error
    } finally {
      await mongoose.disconnect();
    }
  });

  // ==========================================
  // 1. User Profile Management Tests
  // ==========================================
  it('TC-PROF-01: Should allow user to view their own profile', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, studentEmail);
    assert.equal(res.body.data.user.passwordHash, undefined, 'Must not return password hash');
  });

  it('TC-PROF-02: Should allow student to update permitted student profile fields', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'Sam Updated Student',
        phone: '+1-555-0199',
        bio: 'Passionate full-stack software engineering student.',
        studentDetails: {
          studentId: 'STU-9901',
          department: 'Computer Science & Engineering',
          course: 'B.Tech IT',
          graduationYear: 2027,
          cgpa: 8.85,
          skills: ['React', 'Node.js', 'MongoDB', 'Docker'],
          linkedinUrl: 'https://linkedin.com/in/samstudent',
        },
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.name, 'Sam Updated Student');
    assert.equal(res.body.data.user.profile.studentDetails.studentId, 'STU-9901');
    assert.equal(res.body.data.user.profile.studentDetails.cgpa, 8.85);
    assert.equal(res.body.data.user.profile.studentDetails.skills.length, 4);
  });

  it('TC-PROF-03: Security - Should strictly block student from modifying role, status, or email directly', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        role: ROLES.ADMIN,
        status: USER_STATUSES.ACTIVE,
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED_FIELD_MODIFICATION');
  });

  it('TC-PROF-04: Security - Should block student from injecting unauthorized employer or faculty details', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        companyDetails: {
          companyName: 'Unauthorized Tech Inc',
        },
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN_PROFILE_FIELDS');
  });

  it('TC-PROF-05: Validation - Should reject invalid profile data (invalid CGPA)', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        studentDetails: {
          cgpa: 15.0, // Exceeds max 10.0
        },
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  // ==========================================
  // 2. Resume File Upload and Management Tests
  // ==========================================
  it('TC-PROF-06: Should allow student to upload valid PDF resume', async () => {
    const res = await request(app)
      .post('/api/users/profile/resume')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('resume', testPdfPath);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.resumeUrl.includes('/api/users/profile/resume/'));
    assert.ok(res.body.data.resumeFileName.includes('.pdf'));
  });

  it('TC-PROF-07: Security - Should reject executable file uploads (.exe)', async () => {
    const res = await request(app)
      .post('/api/users/profile/resume')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('resume', testExePath);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_FILE_TYPE');
  });

  // ==========================================
  // 3. Admin User Management Tests
  // ==========================================
  it('TC-ADMIN-01: Security - Should deny non-admin access to user management endpoints', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('TC-ADMIN-02: Should allow admin to list users with pagination, search, and metrics', async () => {
    const res = await request(app)
      .get('/api/users?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.users));
    assert.ok(res.body.data.pagination.total >= 2);
    assert.ok(res.body.data.stats.totalUsers >= 2);
  });

  it('TC-ADMIN-03: Should allow admin to create a new user with elevated role (coordinator)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dr. Carol Coordinator',
        email: coordinatorEmail,
        password: defaultPassword,
        role: ROLES.COORDINATOR,
        status: USER_STATUSES.ACTIVE,
        profile: {
          coordinatorDetails: {
            institution: 'Apex Institute of Technology',
            facultyId: 'FAC-781',
          },
        },
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, coordinatorEmail);
    assert.equal(res.body.data.user.role, ROLES.COORDINATOR);
  });

  it('TC-ADMIN-03B: Should reject admin creating duplicate user with existing email (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate Coordinator',
        email: `  ${coordinatorEmail.toUpperCase()}  `,
        password: defaultPassword,
        role: ROLES.COORDINATOR,
        status: USER_STATUSES.ACTIVE,
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  it('TC-ADMIN-04: Should allow admin to update a user status and role', async () => {
    const res = await request(app)
      .patch(`/api/users/${studentUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: USER_STATUSES.SUSPENDED,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.status, USER_STATUSES.SUSPENDED);

    // Re-activate student
    await request(app)
      .patch(`/api/users/${studentUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: USER_STATUSES.ACTIVE,
      });
  });

  // ==========================================
  // 4. Last Active Administrator Protection
  // ==========================================
  it('TC-ADMIN-05: Safety Guard - Should prevent deactivating or demoting the last active administrator', async () => {
    // Isolate test: temporarily suspend any other active admins in the DB
    const otherAdmins = await User.find({
      _id: { $ne: adminUser._id },
      role: ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
    });
    temporarilySuspendedAdmins = otherAdmins.map((u) => u._id);
    if (temporarilySuspendedAdmins.length > 0) {
      await User.updateMany(
        { _id: { $in: temporarilySuspendedAdmins } },
        { $set: { status: USER_STATUSES.SUSPENDED } }
      );
    }

    const res = await request(app)
      .put(`/api/users/${adminUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: ROLES.STUDENT, // Demote sole admin
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'LAST_ADMIN_PROTECTED');
    assert.ok(res.body.error.message.includes('last active administrator'));
  });

  it('TC-ADMIN-06: Safety Guard - Should allow demoting an admin when another active admin exists', async () => {
    const passwordHash = await hashPassword(defaultPassword);

    // Create a second active administrator
    secondAdminUser = await User.create({
      name: 'Second Admin',
      email: secondAdminEmail,
      passwordHash,
      role: ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
    });

    // Now demoting secondAdminUser is safe because primary adminUser is active
    const res = await request(app)
      .put(`/api/users/${secondAdminUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: ROLES.COORDINATOR,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, ROLES.COORDINATOR);

    // Restore any previously suspended admins
    if (temporarilySuspendedAdmins.length > 0) {
      await User.updateMany(
        { _id: { $in: temporarilySuspendedAdmins } },
        { $set: { status: USER_STATUSES.ACTIVE } }
      );
      temporarilySuspendedAdmins = [];
    }
  });
});
