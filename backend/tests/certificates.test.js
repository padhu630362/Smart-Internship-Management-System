import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES } from '../src/models/User.js';
import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../src/models/Internship.js';
import { Allocation, ALLOCATION_STATUSES } from '../src/models/Allocation.js';
import { Certificate, CERTIFICATE_STATUSES, EMAIL_DELIVERY_STATUSES } from '../src/models/Certificate.js';
import {
  issueCertificate,
  generateCertificatePdfBuffer,
  deliverCertificateEmail,
} from '../src/services/certificateService.js';
import { signToken } from '../src/utils/jwt.js';

describe('Completion Certificate & Email Delivery System Tests', () => {
  const timestamp = Date.now();
  let studentUser;
  let companyUser;
  let mentorUser;
  let adminUser;
  let studentToken;
  let mentorToken;
  let adminToken;
  let internshipDoc;
  let allocationDoc;
  let certificateDoc;

  const validStartDate = new Date('2026-01-15T00:00:00Z');
  const validEndDate = new Date('2026-06-15T00:00:00Z');

  before(async () => {
    await connectDB();

    studentUser = await User.create({
      name: `Graduating Intern ${timestamp}`,
      email: `intern_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      status: 'active',
      profile: {
        studentDetails: {
          studentId: 'STU-9921',
          department: 'Computer Science',
        },
      },
    });
    studentToken = signToken({
      id: studentUser._id.toString(),
      role: studentUser.role,
      email: studentUser.email,
    });

    companyUser = await User.create({
      name: `Host Corp ${timestamp}`,
      email: `hostcorp_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.COMPANY,
      status: 'active',
    });

    mentorUser = await User.create({
      name: `Dr. Mentor ${timestamp}`,
      email: `mentor_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.MENTOR,
      status: 'active',
    });
    mentorToken = signToken({
      id: mentorUser._id.toString(),
      role: mentorUser.role,
      email: mentorUser.email,
    });

    adminUser = await User.create({
      name: `System Admin ${timestamp}`,
      email: `admin_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      status: 'active',
    });
    adminToken = signToken({
      id: adminUser._id.toString(),
      role: adminUser.role,
      email: adminUser.email,
    });

    internshipDoc = await Internship.create({
      title: 'Cloud Systems Engineering Intern',
      description: 'Architecting distributed Kubernetes systems.',
      company: companyUser._id,
      companyName: companyUser.name,
      mentor: mentorUser._id,
      requiredSkills: ['Kubernetes', 'Go', 'Docker'],
      duration: '6 Months',
      location: 'New York, NY',
      workMode: WORK_MODES.HYBRID,
      status: INTERNSHIP_STATUSES.PUBLISHED,
      createdBy: companyUser._id,
      applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    allocationDoc = await Allocation.create({
      student: studentUser._id,
      internship: internshipDoc._id,
      company: companyUser._id,
      mentor: mentorUser._id,
      allocatedBy: adminUser._id,
      startDate: validStartDate,
      endDate: validEndDate,
      status: ALLOCATION_STATUSES.ACTIVE,
    });

    // Issue initial certificate directly with verified start and end dates
    certificateDoc = await issueCertificate({
      allocation: allocationDoc,
      student: studentUser,
      internship: internshipDoc,
      company: companyUser,
      mentor: mentorUser,
      startDate: validStartDate,
      endDate: validEndDate,
      finalRating: 4.8,
      recommendation: 'Highly Recommended',
    });
  });

  after(async () => {
    try {
      await User.deleteMany({
        _id: { $in: [studentUser?._id, companyUser?._id, mentorUser?._id, adminUser?._id] },
      });
      await Internship.deleteMany({ _id: internshipDoc?._id });
      await Allocation.deleteMany({ _id: allocationDoc?._id });
      await Certificate.deleteMany({ student: studentUser?._id });
    } catch {
      // cleanup ignore
    } finally {
      await mongoose.disconnect();
    }
  });

  it('CERT-01: Should issue authentic Certificate with verified dates and generate valid PDF buffer', async () => {
    assert.ok(certificateDoc._id);
    assert.ok(certificateDoc.certificateNumber.startsWith('CERT-'));
    assert.ok(certificateDoc.verificationCode.startsWith('SIMS-'));
    assert.equal(certificateDoc.studentName, studentUser.name);
    assert.equal(certificateDoc.status, CERTIFICATE_STATUSES.ISSUED);
    assert.equal(certificateDoc.grade, 'Distinction');
    assert.ok(certificateDoc.startDate);
    assert.ok(certificateDoc.endDate);
    assert.ok(
      [EMAIL_DELIVERY_STATUSES.PENDING, EMAIL_DELIVERY_STATUSES.SENT, EMAIL_DELIVERY_STATUSES.FAILED].includes(
        certificateDoc.emailDeliveryStatus
      )
    );

    // Test binary PDF buffer generation
    const pdfBuffer = await generateCertificatePdfBuffer(certificateDoc);
    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 1000);
    // PDF Magic bytes: %PDF
    assert.equal(pdfBuffer.subarray(0, 4).toString(), '%PDF');
  });

  it('CERT-02: Should strictly reject issuance when verified start or end date is missing or invalid', async () => {
    const uncertifiedStudent = await User.create({
      name: `Uncertified Intern ${timestamp}`,
      email: `uncertified_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      status: 'active',
    });

    try {
      // Missing start date
      await assert.rejects(
        async () => {
          await issueCertificate({
            student: uncertifiedStudent,
            internship: internshipDoc,
            company: companyUser,
            startDate: null,
            endDate: validEndDate,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_START_DATE');
          return true;
        }
      );

      // Missing end date
      await assert.rejects(
        async () => {
          await issueCertificate({
            student: uncertifiedStudent,
            internship: internshipDoc,
            company: companyUser,
            startDate: validStartDate,
            endDate: null,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_END_DATE');
          return true;
        }
      );

      // End date before start date
      await assert.rejects(
        async () => {
          await issueCertificate({
            student: uncertifiedStudent,
            internship: internshipDoc,
            company: companyUser,
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-01-01'),
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'INVALID_DATE_RANGE');
          return true;
        }
      );
    } finally {
      await User.deleteOne({ _id: uncertifiedStudent._id });
    }
  });

  it('CERT-03: Repeated issuance request should safely reuse existing certificate without duplicating records', async () => {
    const totalBefore = await Certificate.countDocuments({ student: studentUser._id });

    // Request issuance again for the same allocation
    const secondCall = await issueCertificate({
      allocation: allocationDoc,
      student: studentUser,
      internship: internshipDoc,
      company: companyUser,
      startDate: validStartDate,
      endDate: validEndDate,
    });

    const totalAfter = await Certificate.countDocuments({ student: studentUser._id });

    assert.equal(totalBefore, totalAfter);
    assert.equal(secondCall._id.toString(), certificateDoc._id.toString());
    assert.equal(secondCall.certificateNumber, certificateDoc.certificateNumber);
  });

  it('CERT-04: Student role should be forbidden (403) from calling certificate issuance endpoint', async () => {
    const res = await request(app)
      .post(`/api/certificates/allocation/${allocationDoc._id}/issue`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('CERT-05: Student role should be forbidden (403) from calling email resend endpoint', async () => {
    const res = await request(app)
      .post(`/api/certificates/${certificateDoc._id}/resend-email`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('CERT-06: Authorized mentor/admin can issue certificate and trigger tracked email delivery', async () => {
    const res = await request(app)
      .post(`/api/certificates/allocation/${allocationDoc._id}/issue`)
      .set('Authorization', `Bearer ${mentorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.certificate);
    assert.ok(res.body.data.emailDelivery);
    assert.equal(res.body.data.certificate._id, certificateDoc._id.toString());
  });

  it('CERT-07: Explicit email resend endpoint by authorized admin dispatches tracked delivery', async () => {
    const res = await request(app)
      .post(`/api/certificates/${certificateDoc._id}/resend-email`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.emailDelivery);
    assert.ok(
      [EMAIL_DELIVERY_STATUSES.SENT, EMAIL_DELIVERY_STATUSES.FAILED].includes(
        res.body.data.certificate.emailDeliveryStatus
      )
    );
  });

  it('CERT-08: GET /api/certificates/my should retrieve student awarded certificates', async () => {
    const res = await request(app)
      .get('/api/certificates/my')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.certificates));
    assert.equal(res.body.data.certificates.length, 1);
    assert.equal(res.body.data.certificates[0].certificateNumber, certificateDoc.certificateNumber);
    assert.ok(res.body.data.certificates[0].startDate);
    assert.ok(res.body.data.certificates[0].endDate);
  });

  it('CERT-09: GET /api/certificates/verify/:code publicly validates credential and dates without exposing student email/ID', async () => {
    const res = await request(app)
      .get(`/api/certificates/verify/${certificateDoc.verificationCode}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.valid, true);
    assert.equal(res.body.data.studentName, studentUser.name);
    assert.equal(res.body.data.internshipTitle, internshipDoc.title);
    assert.ok(res.body.data.startDate);
    assert.ok(res.body.data.endDate);

    // Verify sensitive PII is NOT leaked
    assert.equal(res.body.data.studentEmail, undefined);
    assert.equal(res.body.data.studentCollegeId, undefined);
    assert.equal(res.body.data.student, undefined);
  });

  it('CERT-10: GET /api/certificates/verify/:code returns invalid envelope for fake credentials', async () => {
    const res = await request(app)
      .get('/api/certificates/verify/FAKE-INVALID-CODE-9999');

    assert.equal(res.status, 404);
    assert.equal(res.body.valid, false);
  });

  it('CERT-11: GET /api/certificates/:id/download dynamically streams PDF certificate', async () => {
    const res = await request(app)
      .get(`/api/certificates/${certificateDoc._id}/download?token=${studentToken}`)
      .responseType('blob');

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.ok(res.body);
  });

  it('CERT-12: PATCH /api/allocations/:id/status completed with missing dates should be blocked with 400', async () => {
    // Insert allocation directly into MongoDB collection without schema validation to simulate legacy record
    const insertResult = await Allocation.collection.insertOne({
      student: studentUser._id,
      internship: internshipDoc._id,
      company: companyUser._id,
      mentor: mentorUser._id,
      allocatedBy: adminUser._id,
      status: ALLOCATION_STATUSES.ACTIVE,
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const allocNoDatesId = insertResult.insertedId;

    const res = await request(app)
      .patch(`/api/allocations/${allocNoDatesId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: ALLOCATION_STATUSES.COMPLETED,
        note: 'Attempting completion without verified dates',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error?.code, 'INVALID_START_DATE');

    // Clean up
    await Allocation.deleteOne({ _id: allocNoDatesId });
  });

  it('CERT-13: PATCH /api/allocations/:id/status completed triggers certificate generation and email delivery', async () => {
    const res = await request(app)
      .patch(`/api/allocations/${allocationDoc._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: ALLOCATION_STATUSES.COMPLETED,
        note: 'Internship fully verified and completed.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.allocation.status, ALLOCATION_STATUSES.COMPLETED);
    assert.ok(res.body.data.certificate);
    assert.ok(res.body.data.emailDelivery);
  });
});
