import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES } from '../src/models/User.js';
import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../src/models/Internship.js';
import { Certificate, CERTIFICATE_STATUSES } from '../src/models/Certificate.js';
import { issueCertificate } from '../src/services/certificateService.js';
import { signToken } from '../src/utils/jwt.js';

describe('Completion Certificate System Integration Tests', () => {
  const timestamp = Date.now();
  let studentUser;
  let companyUser;
  let mentorUser;
  let studentToken;
  let internshipDoc;
  let certificateDoc;

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

    // Issue certificate directly via certificate service
    certificateDoc = await issueCertificate({
      student: studentUser,
      internship: internshipDoc,
      company: companyUser,
      mentor: mentorUser,
      finalRating: 4.8,
      recommendation: 'Highly Recommended',
    });
  });

  after(async () => {
    try {
      await User.deleteMany({ _id: { $in: [studentUser?._id, companyUser?._id, mentorUser?._id] } });
      await Internship.deleteMany({ _id: internshipDoc?._id });
      await Certificate.deleteMany({ _id: certificateDoc?._id });
    } catch {
      // cleanup ignore
    } finally {
      await mongoose.disconnect();
    }
  });

  it('CERT-01: Should issue authentic Certificate record with unique verification code', () => {
    assert.ok(certificateDoc._id);
    assert.ok(certificateDoc.certificateNumber.startsWith('CERT-'));
    assert.ok(certificateDoc.verificationCode.startsWith('SIMS-'));
    assert.equal(certificateDoc.studentName, studentUser.name);
    assert.equal(certificateDoc.status, CERTIFICATE_STATUSES.ISSUED);
    assert.equal(certificateDoc.grade, 'Distinction');
  });

  it('CERT-02: GET /api/certificates/my should retrieve student awarded certificates', async () => {
    const res = await request(app)
      .get('/api/certificates/my')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.certificates));
    assert.equal(res.body.data.certificates.length, 1);
    assert.equal(res.body.data.certificates[0].certificateNumber, certificateDoc.certificateNumber);
  });

  it('CERT-03: GET /api/certificates/verify/:code publicly validates authentic credentials', async () => {
    const res = await request(app)
      .get(`/api/certificates/verify/${certificateDoc.verificationCode}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.valid, true);
    assert.equal(res.body.data.studentName, studentUser.name);
    assert.equal(res.body.data.internshipTitle, internshipDoc.title);
  });

  it('CERT-04: GET /api/certificates/verify/:code returns invalid envelope for fake credentials', async () => {
    const res = await request(app)
      .get('/api/certificates/verify/FAKE-INVALID-CODE-9999');

    assert.equal(res.status, 404);
    assert.equal(res.body.valid, false);
  });

  it('CERT-05: GET /api/certificates/:id/download dynamically streams PDF certificate', async () => {
    const res = await request(app)
      .get(`/api/certificates/${certificateDoc._id}/download?token=${studentToken}`)
      .responseType('blob');

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.ok(res.body);
  });
});
