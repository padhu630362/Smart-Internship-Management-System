import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES } from '../src/models/User.js';
import { Internship, WORK_MODES, INTERNSHIP_STATUSES } from '../src/models/Internship.js';
import { Application, APPLICATION_STATUSES } from '../src/models/Application.js';
import { calculateDeterministicMatch } from '../src/services/aiService.js';
import { signToken } from '../src/utils/jwt.js';

describe('AI Resume Analysis & Skill Matching Integration Tests', () => {
  const timestamp = Date.now();
  let studentUser;
  let companyUser;
  let studentToken;
  let internshipDoc;
  let applicationDoc;

  before(async () => {
    await connectDB();

    // Create test student
    studentUser = await User.create({
      name: `AI Student ${timestamp}`,
      email: `aistudent_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      status: 'active',
      profile: {
        studentDetails: {
          skills: ['React', 'Node.js', 'MongoDB', 'JavaScript'],
          department: 'Computer Science',
          cgpa: 8.8,
          resumeUrl: '/api/users/profile/resume/sample-resume.pdf',
        },
      },
    });
    studentToken = signToken({
      id: studentUser._id.toString(),
      role: studentUser.role,
      email: studentUser.email,
    });

    // Create test company
    companyUser = await User.create({
      name: `AI Enterprise ${timestamp}`,
      email: `aienterprise_${timestamp}@example.com`,
      passwordHash: 'dummyhash',
      role: ROLES.COMPANY,
      status: 'active',
    });

    // Create test internship
    internshipDoc = await Internship.create({
      title: 'Full Stack AI Developer Intern',
      description: 'Building modern web applications with React and Node.js.',
      company: companyUser._id,
      companyName: companyUser.name,
      requiredSkills: ['React', 'Node.js', 'TypeScript', 'Docker'],
      eligibility: {
        minCgpa: 7.5,
        allowedDepartments: ['Computer Science', 'Information Technology'],
      },
      duration: '3 Months',
      location: 'San Francisco, CA',
      workMode: WORK_MODES.REMOTE,
      status: INTERNSHIP_STATUSES.PUBLISHED,
      createdBy: companyUser._id,
      applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    // Create test application
    applicationDoc = await Application.create({
      internship: internshipDoc._id,
      student: studentUser._id,
      company: companyUser._id,
      status: APPLICATION_STATUSES.SUBMITTED,
      resumeUrl: '/api/users/profile/resume/sample-resume.pdf',
      resumeFileName: 'Alex_Resume.pdf',
      studentSnapshot: {
        name: studentUser.name,
        email: studentUser.email,
        department: 'Computer Science',
        cgpa: 8.8,
        skills: ['React', 'Node.js', 'MongoDB'],
      },
      statusHistory: [
        {
          status: APPLICATION_STATUSES.SUBMITTED,
          changedBy: studentUser._id,
          changedByName: studentUser.name,
          note: 'Initial test submission',
        },
      ],
    });
  });

  after(async () => {
    try {
      await User.deleteMany({ _id: { $in: [studentUser?._id, companyUser?._id] } });
      await Internship.deleteMany({ _id: internshipDoc?._id });
      await Application.deleteMany({ _id: applicationDoc?._id });
    } catch {
      // cleanup ignore
    } finally {
      await mongoose.disconnect();
    }
  });

  it('AI-01: Deterministic matching algorithm accurately calculates overlap and missing skills', () => {
    const analysis = calculateDeterministicMatch({
      resumeText: 'Experienced in React, Node.js, and web systems development.',
      studentProfile: {
        skills: ['React', 'Node.js', 'JavaScript'],
        department: 'Computer Science',
        cgpa: 8.5,
      },
      internship: internshipDoc,
    });

    assert.ok(analysis.matchScore > 50, 'Match score should reflect strong alignment');
    assert.ok(analysis.matchedSkills.includes('React'));
    assert.ok(analysis.matchedSkills.includes('Node.js'));
    assert.ok(analysis.missingSkills.includes('Docker') || analysis.missingSkills.includes('Typescript'));
    assert.ok(analysis.strengths.length > 0);
    assert.ok(analysis.improvements.length > 0);
  });

  it('AI-02: GET /api/internships/:id/match-score computes live student fit score', async () => {
    const res = await request(app)
      .get(`/api/internships/${internshipDoc._id}/match-score`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.matchScore === 'number');
    assert.ok(Array.isArray(res.body.data.matchedSkills));
    assert.ok(Array.isArray(res.body.data.missingSkills));
    assert.ok(res.body.data.engine);
  });

  it('AI-03: POST /api/applications/:id/analyze-resume performs on-demand candidate screening', async () => {
    const res = await request(app)
      .post(`/api/applications/${applicationDoc._id}/analyze-resume`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.aiAnalysis);
    assert.ok(typeof res.body.data.aiAnalysis.matchScore === 'number');
    assert.ok(Array.isArray(res.body.data.aiAnalysis.matchedSkills));
  });
});
