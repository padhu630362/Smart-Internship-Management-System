import mongoose from 'mongoose';
import dns from 'node:dns';
import '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import { User, ROLES, USER_STATUSES } from '../src/models/User.js';
import { Internship, INTERNSHIP_STATUSES, WORK_MODES } from '../src/models/Internship.js';
import { Allocation, ALLOCATION_STATUSES } from '../src/models/Allocation.js';
import { Task, TASK_STATUSES, TASK_PRIORITIES } from '../src/models/Task.js';
import { Certificate, CERTIFICATE_STATUSES } from '../src/models/Certificate.js';
import { hashPassword } from '../src/utils/security.js';
import { logger } from '../src/utils/logger.js';

// Resolve DNS for MongoDB Atlas if run standalone
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where setting DNS is restricted
}

export const DEMO_CREDENTIALS = {
  COMPANY: {
    name: 'NovaTech Demo Labs',
    email: 'novatech@sims-demo.local',
    password: 'DemoPass123!',
    role: ROLES.COMPANY,
  },
  MENTOR: {
    name: 'Demo Mentor',
    email: 'demo.mentor@sims-demo.local',
    password: 'DemoPass123!',
    role: ROLES.MENTOR,
  },
  STUDENT: {
    name: 'Demo Student',
    email: 'demo.student@sims-demo.local',
    password: 'DemoPass123!',
    role: ROLES.STUDENT,
  },
};

/**
 * Clean and Seed the NovaTech Demo Labs workflow
 * @param {Object} options
 * @param {string} [options.stage='default'] - 'default' (Task 3 in_progress), 'submitted' (Task 3 submitted), 'completed' (all 3 tasks completed, ready for completion request/approval)
 */
export async function seedDemoScenario(options = {}) {
  await connectDB();
  const stage = options.stage || 'default';

  logger.info(`[DEMO SEED] Starting NovaTech Demo Labs setup (Stage: ${stage})...`);

  // 1. Clean previous demo records safely (only records with isDemo: true or demo emails)
  const demoEmails = [
    DEMO_CREDENTIALS.COMPANY.email,
    DEMO_CREDENTIALS.MENTOR.email,
    DEMO_CREDENTIALS.STUDENT.email,
  ];

  await Certificate.deleteMany({ isDemo: true });
  await Allocation.deleteMany({ isDemo: true });
  await Internship.deleteMany({ isDemo: true });
  await Task.deleteMany({
    title: {
      $in: [
        'Build a responsive login page',
        'Implement a sample REST API endpoint',
        'Submit the final project and documentation',
      ],
    },
  });

  // 2. Ensure demo users exist
  const hashedPassword = await hashPassword(DEMO_CREDENTIALS.STUDENT.password);

  let companyUser = await User.findOne({ email: DEMO_CREDENTIALS.COMPANY.email });
  if (!companyUser) {
    companyUser = await User.create({
      name: DEMO_CREDENTIALS.COMPANY.name,
      email: DEMO_CREDENTIALS.COMPANY.email,
      passwordHash: hashedPassword,
      role: ROLES.COMPANY,
      status: USER_STATUSES.ACTIVE,
      profile: {
        bio: 'Official demo organization for SIMS end-to-end verification and testing.',
        companyDetails: {
          companyName: DEMO_CREDENTIALS.COMPANY.name,
          industry: 'Software & Cloud Engineering',
          website: 'https://novatech-demo.local',
        },
      },
    });
  }

  let mentorUser = await User.findOne({ email: DEMO_CREDENTIALS.MENTOR.email });
  if (!mentorUser) {
    mentorUser = await User.create({
      name: DEMO_CREDENTIALS.MENTOR.name,
      email: DEMO_CREDENTIALS.MENTOR.email,
      passwordHash: hashedPassword,
      role: ROLES.MENTOR,
      status: USER_STATUSES.ACTIVE,
      profile: {
        bio: 'Senior Engineering Mentor at NovaTech Demo Labs.',
        department: 'Cloud Applications Group',
      },
    });
  }

  let studentUser = await User.findOne({ email: DEMO_CREDENTIALS.STUDENT.email });
  if (!studentUser) {
    studentUser = await User.create({
      name: DEMO_CREDENTIALS.STUDENT.name,
      email: DEMO_CREDENTIALS.STUDENT.email,
      passwordHash: hashedPassword,
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      profile: {
        bio: 'Computer Science candidate enrolled in the NovaTech Demo program.',
        department: 'Computer Science & Engineering',
        studentDetails: {
          studentId: 'DEMO-CS-2026',
          university: 'SIMS Institute of Technology',
          cgpa: 9.2,
          graduationYear: 2026,
        },
      },
    });
  }

  // 3. Create Demo Internship
  const demoInternship = await Internship.create({
    title: 'Full-Stack Web Development Internship (Demo)',
    description:
      'Hands-on demonstration internship covering modern full-stack web development with React, Node.js, and MongoDB. Learn architectural best practices, RESTful APIs, and responsive design.',
    company: companyUser._id,
    companyName: companyUser.name,
    mentor: mentorUser._id,
    workMode: WORK_MODES.REMOTE,
    status: INTERNSHIP_STATUSES.PUBLISHED,
    openings: 5,
    duration: '4 Weeks (Sample Period)',
    location: 'Remote Demo Labs',
    requiredSkills: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'Express'],
    createdBy: companyUser._id,
    applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isDemo: true,
  });

  // 4. Create Demo Allocation
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const isPreCompleted = stage === 'completed';
  const demoAllocation = await Allocation.create({
    student: studentUser._id,
    internship: demoInternship._id,
    company: companyUser._id,
    mentor: mentorUser._id,
    startDate: thirtyDaysAgo,
    endDate: yesterday,
    status: ALLOCATION_STATUSES.ACTIVE,
    allocatedBy: companyUser._id,
    isDemo: true,
    notes: 'Demonstration allocation for NovaTech Demo Labs evaluation and certificate issuance.',
    completionRequest: {
      status: isPreCompleted ? 'approved' : 'none',
      requestedAt: isPreCompleted ? yesterday : null,
      studentNotes: isPreCompleted ? 'All 3 demo milestones completed successfully.' : '',
      preferredDeliveryEmail: studentUser.email,
      reviewedAt: isPreCompleted ? now : null,
      reviewedBy: isPreCompleted ? mentorUser._id : null,
      feedback: isPreCompleted ? 'Demo completion pre-approved for immediate certificate issuance.' : '',
    },
    statusHistory: [
      {
        status: ALLOCATION_STATUSES.ACTIVE,
        changedBy: companyUser._id,
        changedByName: companyUser.name,
        changedAt: thirtyDaysAgo,
        note: 'Candidate placed into demo allocation.',
      },
    ],
  });

  // 5. Create the 3 Demo Tasks
  const task1 = await Task.create({
    title: 'Build a responsive login page',
    description: 'Implement an accessible, mobile-friendly login screen with client-side form validation.',
    allocation: demoAllocation._id,
    internship: demoInternship._id,
    assignedTo: studentUser._id,
    assignedBy: mentorUser._id,
    dueDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    priority: TASK_PRIORITIES.HIGH,
    status: TASK_STATUSES.COMPLETED,
    progressPercentage: 100,
    submissionNotes: 'Login form implemented with email/password validation, responsive design, and error alerts.',
    submissionLink: 'https://github.com/novatech-demo/login-feature',
    reviewerFeedback: 'Excellent responsive layout, clean accessibility labels, and validated edge cases.',
    submittedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
    reviewedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    reviewedBy: mentorUser._id,
    history: [
      {
        action: 'TASK_CREATED',
        changedBy: mentorUser._id,
        changedByName: mentorUser.name,
        timestamp: thirtyDaysAgo,
        status: TASK_STATUSES.TODO,
        note: 'Task initially created.',
      },
      {
        action: 'TASK_REVIEWED',
        changedBy: mentorUser._id,
        changedByName: mentorUser.name,
        timestamp: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        status: TASK_STATUSES.COMPLETED,
        note: 'Approved by mentor.',
      },
    ],
  });

  const task2 = await Task.create({
    title: 'Implement a sample REST API endpoint',
    description: 'Develop secure Express endpoints for resource CRUD operations with JWT authentication.',
    allocation: demoAllocation._id,
    internship: demoInternship._id,
    assignedTo: studentUser._id,
    assignedBy: mentorUser._id,
    dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    priority: TASK_PRIORITIES.HIGH,
    status: TASK_STATUSES.COMPLETED,
    progressPercentage: 100,
    submissionNotes: 'Full CRUD REST API endpoints implemented with validation and JWT auth headers.',
    submissionLink: 'https://github.com/novatech-demo/api-feature',
    reviewerFeedback: 'Solid RESTful design, proper HTTP status codes, and thorough error handling.',
    submittedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
    reviewedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    reviewedBy: mentorUser._id,
    history: [
      {
        action: 'TASK_CREATED',
        changedBy: mentorUser._id,
        changedByName: mentorUser.name,
        timestamp: thirtyDaysAgo,
        status: TASK_STATUSES.TODO,
        note: 'Task initially created.',
      },
      {
        action: 'TASK_REVIEWED',
        changedBy: mentorUser._id,
        changedByName: mentorUser.name,
        timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        status: TASK_STATUSES.COMPLETED,
        note: 'Approved by mentor.',
      },
    ],
  });

  // Task 3 status based on stage
  let task3Status = TASK_STATUSES.IN_PROGRESS;
  let task3Progress = 85;
  let task3SubmittedAt = null;
  let task3ReviewedAt = null;
  let task3Feedback = '';

  if (stage === 'submitted') {
    task3Status = TASK_STATUSES.SUBMITTED;
    task3Progress = 100;
    task3SubmittedAt = new Date();
  } else if (stage === 'completed') {
    task3Status = TASK_STATUSES.COMPLETED;
    task3Progress = 100;
    task3SubmittedAt = yesterday;
    task3ReviewedAt = now;
    task3Feedback = 'Final project and comprehensive documentation fully approved.';
  }

  const task3 = await Task.create({
    title: 'Submit the final project and documentation',
    description: 'Package the application code, provide an architecture README, and submit live deploy link.',
    allocation: demoAllocation._id,
    internship: demoInternship._id,
    assignedTo: studentUser._id,
    assignedBy: mentorUser._id,
    dueDate: now,
    priority: TASK_PRIORITIES.MEDIUM,
    status: task3Status,
    progressPercentage: task3Progress,
    submissionNotes: 'Final full-stack app bundle prepared with comprehensive README architecture diagram.',
    submissionLink: 'https://github.com/novatech-demo/final-showcase',
    submittedAt: task3SubmittedAt,
    reviewedAt: task3ReviewedAt,
    reviewedBy: task3ReviewedAt ? mentorUser._id : null,
    reviewerFeedback: task3Feedback,
    history: [
      {
        action: 'TASK_CREATED',
        changedBy: mentorUser._id,
        changedByName: mentorUser.name,
        timestamp: thirtyDaysAgo,
        status: TASK_STATUSES.TODO,
        note: 'Task initially created.',
      },
    ],
  });

  logger.info(`[DEMO SEED] Successfully seeded NovaTech Demo Labs!`);
  logger.info(`  Company:  ${companyUser.email} (${companyUser.name})`);
  logger.info(`  Mentor:   ${mentorUser.email} (${mentorUser.name})`);
  logger.info(`  Student:  ${studentUser.email} (${studentUser.name})`);
  logger.info(`  Password: ${DEMO_CREDENTIALS.STUDENT.password}`);
  logger.info(`  Allocation ID: ${demoAllocation._id}`);

  return {
    success: true,
    message: 'Demo scenario seeded successfully.',
    data: {
      credentials: DEMO_CREDENTIALS,
      company: { id: companyUser._id, name: companyUser.name, email: companyUser.email },
      mentor: { id: mentorUser._id, name: mentorUser.name, email: mentorUser.email },
      student: { id: studentUser._id, name: studentUser.name, email: studentUser.email },
      internship: { id: demoInternship._id, title: demoInternship.title },
      allocation: { id: demoAllocation._id, status: demoAllocation.status, completionRequest: demoAllocation.completionRequest },
      tasks: [
        { id: task1._id, title: task1.title, status: task1.status },
        { id: task2._id, title: task2.title, status: task2.status },
        { id: task3._id, title: task3.title, status: task3.status },
      ],
    },
  };
}

// Standalone execution if run via CLI: node scripts/seed_demo.mjs
if (process.argv[1] && process.argv[1].endsWith('seed_demo.mjs')) {
  const stageArg = process.argv.find((arg) => arg.startsWith('--stage='));
  const stage = stageArg ? stageArg.split('=')[1] : 'default';

  seedDemoScenario({ stage })
    .then((result) => {
      console.log('\n========================================================');
      console.log('✅ NOVA TECH DEMO LABS SEEDED SUCCESSFULLY');
      console.log('========================================================');
      console.log(`Demo Student Login: ${result.data.student.email} / ${DEMO_CREDENTIALS.STUDENT.password}`);
      console.log(`Demo Mentor Login:  ${result.data.mentor.email} / ${DEMO_CREDENTIALS.MENTOR.password}`);
      console.log(`Demo Company Login: ${result.data.company.email} / ${DEMO_CREDENTIALS.COMPANY.password}`);
      console.log('========================================================\n');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to seed demo scenario:', err);
      process.exit(1);
    });
}
