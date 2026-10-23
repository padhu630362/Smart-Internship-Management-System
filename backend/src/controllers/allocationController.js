import { Allocation, ALLOCATION_STATUSES } from '../models/Allocation.js';
import { Task, TASK_STATUSES } from '../models/Task.js';
import { User, ROLES } from '../models/User.js';
import { Internship } from '../models/Internship.js';
import {
  createAndDispatchNotification,
  NOTIFICATION_TYPES,
} from '../services/notificationService.js';
import {
  issueCertificate,
  deliverCertificateEmail,
} from '../services/certificateService.js';
import { logger } from '../utils/logger.js';

/**
 * Create a new internship allocation
 */
export const createAllocation = async (req, res, next) => {
  try {
    const { notes, applicationId } = req.body;
    const student = req.targetStudent;
    const internship = req.targetInternship;
    const mentorId = req.verifiedMentorId;
    const start = req.parsedStartDate;
    const end = req.parsedEndDate;

    const initialHistory = {
      status: ALLOCATION_STATUSES.ACTIVE,
      changedBy: req.user.id,
      changedByName: req.user.name,
      changedAt: new Date(),
      note: notes ? notes.trim() : 'Candidate officially placed into internship allocation.',
    };

    const allocation = await Allocation.create({
      student: student._id,
      internship: internship._id,
      company: internship.company,
      mentor: mentorId || null,
      application: applicationId || null,
      startDate: start,
      endDate: end,
      status: ALLOCATION_STATUSES.ACTIVE,
      allocatedBy: req.user.id,
      notes: notes ? notes.trim() : '',
      statusHistory: [initialHistory],
    });

    const populatedAllocation = await Allocation.findById(allocation._id)
      .populate('student', 'name email profile')
      .populate('internship', 'title location workMode stipend duration')
      .populate('company', 'name email profile')
      .populate('mentor', 'name email profile');

    // Notify student of official internship allocation
    createAndDispatchNotification({
      recipientId: student._id,
      senderId: req.user.id,
      type: NOTIFICATION_TYPES.INTERN_ALLOCATED,
      title: 'Internship Allocation Confirmed',
      message: `Congratulations! You have been placed into "${internship.title}".`,
      link: '/dashboard',
      eventKey: `allocation_student:${allocation._id}`,
      metadata: {
        allocationId: allocation._id,
        internshipId: internship._id,
      },
    }).catch(() => {});

    // If a mentor is assigned, notify the mentor
    if (mentorId) {
      createAndDispatchNotification({
        recipientId: mentorId,
        senderId: req.user.id,
        type: NOTIFICATION_TYPES.INTERN_ALLOCATED,
        title: 'New Intern Assigned',
        message: `${student.name} has been assigned to your mentorship for "${internship.title}".`,
        link: '/manage/allocations',
        eventKey: `allocation_mentor:${allocation._id}`,
        metadata: {
          allocationId: allocation._id,
          studentId: student._id,
        },
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Student assigned to internship allocation successfully.',
      data: { allocation: populatedAllocation },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List allocations with search, filters, and role scoping
 */
export const getAllocations = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = {};
    const userRole = req.user.role;

    if (userRole === ROLES.STUDENT) {
      query.student = req.user.id;
    } else if (userRole === ROLES.COMPANY) {
      query.company = req.user.id;
    } else if (userRole === ROLES.MENTOR) {
      if (req.query.assignedOnly === 'true') {
        query.mentor = req.user.id;
      } else {
        query.$or = [
          { mentor: req.user.id },
          { company: req.user.id },
          { mentor: null },
          { mentor: { $exists: false } },
          { isDemo: true },
        ];
      }
    } else if ((userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR) && req.query.companyId) {
      query.company = req.query.companyId;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.studentId && userRole !== ROLES.STUDENT) {
      query.student = req.query.studentId;
    }

    if (req.query.internshipId) {
      query.internship = req.query.internshipId;
    }

    const [allocations, total] = await Promise.all([
      Allocation.find(query)
        .populate('student', 'name email profile')
        .populate('internship', 'title companyName location workMode')
        .populate('company', 'name email profile')
        .populate('mentor', 'name email profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Allocation.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        allocations,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single allocation by ID
 */
export const getAllocationById = async (req, res, next) => {
  try {
    const allocation = await Allocation.findById(req.params.id)
      .populate('student', 'name email profile')
      .populate('internship')
      .populate('company', 'name email profile')
      .populate('mentor', 'name email profile')
      .populate('allocatedBy', 'name email');

    if (!allocation) {
      const error = new Error('Allocation not found.');
      error.statusCode = 404;
      error.code = 'ALLOCATION_NOT_FOUND';
      return next(error);
    }

    // Role verification
    const userId = req.user.id;
    const userRole = req.user.role;
    const isStudent = allocation.student._id.toString() === userId;
    const isCompany = allocation.company._id.toString() === userId;
    const isMentor = allocation.mentor && allocation.mentor._id.toString() === userId;
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

    if (!isStudent && !isCompany && !isMentor && !isPrivileged) {
      const error = new Error('You are not authorized to view this allocation.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_ALLOCATION_VIEW';
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: { allocation },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update allocation status (active, completed, terminated)
 */
export const updateAllocationStatus = async (req, res, next) => {
  try {
    const allocation = req.allocation;
    const { status, note, reason } = req.body;

    // Strict Date Validation for Completion & Certificate Issuance
    if (status === ALLOCATION_STATUSES.COMPLETED) {
      if (!allocation.startDate || isNaN(new Date(allocation.startDate).getTime())) {
        const error = new Error('Cannot approve internship completion: verified internship start date is missing or invalid.');
        error.statusCode = 400;
        error.code = 'INVALID_START_DATE';
        return next(error);
      }
      if (!allocation.endDate || isNaN(new Date(allocation.endDate).getTime())) {
        const error = new Error('Cannot approve internship completion: verified internship end date is missing or invalid.');
        error.statusCode = 400;
        error.code = 'INVALID_END_DATE';
        return next(error);
      }
      if (new Date(allocation.endDate) < new Date(allocation.startDate)) {
        const error = new Error('Cannot approve internship completion: internship end date cannot precede start date.');
        error.statusCode = 400;
        error.code = 'INVALID_DATE_RANGE';
        return next(error);
      }
    }

    const previousStatus = allocation.status;
    allocation.status = status;

    allocation.statusHistory.push({
      status,
      changedBy: req.user.id,
      changedByName: req.user.name,
      changedAt: new Date(),
      note: note ? note.trim() : `Allocation transitioned from '${previousStatus}' to '${status}'.`,
      reason: reason ? reason.trim() : undefined,
    });

    await allocation.save();

    let certificate = null;
    let emailDelivery = null;

    if (status === ALLOCATION_STATUSES.COMPLETED) {
      try {
        const populated = await Allocation.findById(allocation._id)
          .populate('student', 'name email profile')
          .populate('internship', 'title companyName duration')
          .populate('company', 'name email')
          .populate('mentor', 'name email');

        certificate = await issueCertificate({
          allocation: populated,
          internship: populated.internship,
          student: populated.student,
          company: populated.company,
          mentor: populated.mentor,
          startDate: populated.startDate,
          endDate: populated.endDate,
          deliveryEmail: populated.student?.email || populated.completionRequest?.preferredDeliveryEmail,
          issuedBy: req.user.id,
          issuedByRole: req.user.role,
        });

        // Await tracked email delivery safely
        emailDelivery = await deliverCertificateEmail(certificate._id);

        createAndDispatchNotification({
          recipientId: populated.student._id,
          senderId: req.user.id,
          type: NOTIFICATION_TYPES.CERTIFICATE_ISSUED,
          title: 'Completion Certificate Issued!',
          message: `Congratulations! Your internship completion certificate for "${populated.internship?.title || 'Internship'}" has been generated and emailed.`,
          link: '/certificates',
          eventKey: `cert_issued:${certificate._id}`,
          metadata: {
            certificateId: certificate._id,
            certificateNumber: certificate.certificateNumber,
            verificationCode: certificate.verificationCode,
          },
        }).catch(() => {});
      } catch (certErr) {
        logger.error('Failed to issue certificate or deliver email on completion:', certErr);
        if (certErr.statusCode === 400) {
          return next(certErr);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Allocation status successfully changed to '${status}'.`,
      data: {
        allocation,
        certificate,
        emailDelivery,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve internship completion eligibility and pending task criteria
 */
export const getCompletionEligibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allocation = await Allocation.findById(id)
      .populate('student', 'name email profile')
      .populate('internship', 'title companyName duration')
      .populate('mentor', 'name email profile');

    if (!allocation) {
      const error = new Error('Allocation not found.');
      error.statusCode = 404;
      error.code = 'ALLOCATION_NOT_FOUND';
      return next(error);
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const isStudent = allocation.student && allocation.student._id.toString() === userId;
    const isMentor = allocation.mentor && allocation.mentor._id.toString() === userId;
    const isCompany = allocation.company && allocation.company.toString() === userId;
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

    if (!isStudent && !isMentor && !isCompany && !isPrivileged) {
      const error = new Error('Unauthorized to view completion eligibility for this allocation.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    const tasks = await Task.find({ allocation: allocation._id });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === TASK_STATUSES.COMPLETED).length;
    const pendingTasks = tasks.filter(
      (t) => t.status !== TASK_STATUSES.COMPLETED && t.status !== TASK_STATUSES.CANCELLED
    );

    const eligible = totalTasks > 0 ? pendingTasks.length === 0 : true;

    res.status(200).json({
      success: true,
      data: {
        eligible,
        totalTasks,
        completedTasks,
        pendingTasks: pendingTasks.map((t) => ({
          _id: t._id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          progressPercentage: t.progressPercentage,
        })),
        completionRequest: allocation.completionRequest || { status: 'none' },
        defaultEmail: allocation.student?.email || '',
        preferredDeliveryEmail: allocation.completionRequest?.preferredDeliveryEmail || allocation.student?.email || '',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Student requests internship completion after fulfilling tasks
 */
export const requestCompletion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentNotes, preferredDeliveryEmail } = req.body;

    const allocation = await Allocation.findById(id)
      .populate('student', 'name email profile')
      .populate('internship', 'title companyName')
      .populate('mentor', 'name email');

    if (!allocation) {
      const error = new Error('Allocation not found.');
      error.statusCode = 404;
      error.code = 'ALLOCATION_NOT_FOUND';
      return next(error);
    }

    if (req.user.role === ROLES.STUDENT && allocation.student._id.toString() !== req.user.id) {
      const error = new Error('You may only request completion for your own internship.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    if (allocation.status === ALLOCATION_STATUSES.COMPLETED) {
      const error = new Error('This internship allocation has already been completed.');
      error.statusCode = 400;
      error.code = 'ALREADY_COMPLETED';
      return next(error);
    }

    // Email validation if customized
    let deliveryEmail = (preferredDeliveryEmail || allocation.student.email || '').trim().toLowerCase();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (preferredDeliveryEmail && !emailRegex.test(deliveryEmail)) {
      const error = new Error('Invalid preferred delivery email address format.');
      error.statusCode = 400;
      error.code = 'INVALID_EMAIL_FORMAT';
      return next(error);
    }

    // Verify tasks
    const tasks = await Task.find({ allocation: allocation._id });
    const pendingTasks = tasks.filter(
      (t) => t.status !== TASK_STATUSES.COMPLETED && t.status !== TASK_STATUSES.CANCELLED
    );

    if (tasks.length > 0 && pendingTasks.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'REQUIREMENTS_NOT_MET',
        message: `Cannot request completion: ${pendingTasks.length} assigned task(s) are not yet approved by your mentor.`,
        data: {
          pendingTasks: pendingTasks.map((t) => ({
            _id: t._id,
            title: t.title,
            status: t.status,
          })),
        },
      });
    }

    allocation.completionRequest = {
      status: 'pending',
      requestedAt: new Date(),
      studentNotes: studentNotes ? studentNotes.trim() : '',
      preferredDeliveryEmail: deliveryEmail,
      reviewedAt: null,
      reviewedBy: null,
      feedback: '',
    };

    await allocation.save();

    // Notify assigned mentor (or company/coordinator if no mentor assigned)
    const recipientId = allocation.mentor?._id || allocation.company;
    if (recipientId) {
      createAndDispatchNotification({
        recipientId,
        senderId: req.user.id,
        type: NOTIFICATION_TYPES.COMPLETION_REQUESTED,
        title: 'Internship Completion Requested',
        message: `${allocation.student.name} has requested completion for "${allocation.internship?.title || 'Internship'}". Please review tasks and verify completion.`,
        link: '/allocations',
        eventKey: `completion_requested:${allocation._id}`,
        metadata: {
          allocationId: allocation._id,
          studentId: allocation.student._id,
          deliveryEmail,
        },
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'Completion request submitted successfully. Your mentor has been notified.',
      data: {
        allocation,
        completionRequest: allocation.completionRequest,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mentor reviews student completion request (Approve or Reject/Request Revisions)
 */
export const reviewCompletion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, feedback, deliveryEmail } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!['approved', 'rejected', 'request_revisions'].includes(decision)) {
      const error = new Error('Decision must be "approved" or "rejected".');
      error.statusCode = 400;
      error.code = 'INVALID_DECISION';
      return next(error);
    }

    const allocation = await Allocation.findById(id)
      .populate('student', 'name email profile')
      .populate('internship', 'title companyName')
      .populate('mentor', 'name email');

    if (!allocation) {
      const error = new Error('Allocation not found.');
      error.statusCode = 404;
      error.code = 'ALLOCATION_NOT_FOUND';
      return next(error);
    }

    // Role check: Only assigned mentor or privileged roles can review
    const isAssignedMentor = allocation.mentor && allocation.mentor._id.toString() === userId;
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;
    const isCompany = allocation.company && allocation.company.toString() === userId;

    if (!isAssignedMentor && !isPrivileged && !isCompany) {
      const error = new Error('You are not authorized to review completion for this allocation.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    const isApproval = decision === 'approved';
    const statusVal = isApproval ? 'approved' : 'rejected';

    allocation.completionRequest.status = statusVal;
    allocation.completionRequest.reviewedAt = new Date();
    allocation.completionRequest.reviewedBy = req.user.id;
    allocation.completionRequest.feedback = (feedback || (isApproval ? 'Internship completion approved by mentor.' : 'Additional revisions required.')).trim();
    if (deliveryEmail && /^\S+@\S+\.\S+$/.test(deliveryEmail.trim())) {
      allocation.completionRequest.preferredDeliveryEmail = deliveryEmail.trim().toLowerCase();
    }

    await allocation.save();

    // Notify student of outcome
    createAndDispatchNotification({
      recipientId: allocation.student._id,
      senderId: req.user.id,
      type: NOTIFICATION_TYPES.COMPLETION_STATUS,
      title: isApproval ? 'Completion Approved!' : 'Completion Work Revision Requested',
      message: isApproval
        ? `Congratulations! Your mentor approved completion for "${allocation.internship?.title || 'Internship'}". Your certificate can now be issued.`
        : `Your mentor requested further work for "${allocation.internship?.title || 'Internship'}": ${allocation.completionRequest.feedback}`,
      link: isApproval ? '/certificates' : '/tasks',
      eventKey: `completion_reviewed:${allocation._id}:${statusVal}`,
      metadata: {
        allocationId: allocation._id,
        decision: statusVal,
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: isApproval ? 'Completion approved successfully.' : 'Revision requested from intern.',
      data: {
        allocation,
        completionRequest: allocation.completionRequest,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mentors & Coordinators can seed realistic demo enrolled interns and dummy internships
 * with verified start & end dates so they can immediately test task assignment, lifecycle, and certificate issuance.
 */
export const seedMentorDemoAllocations = async (req, res, next) => {
  try {
    const mentorId = req.user.id;

    // 1. Find or pick students
    const hari = await User.findOne({ email: /venkatesanhariharan99/i });
    let demoStudent = await User.findOne({ email: /demo\.student/i });
    if (!demoStudent) {
      demoStudent = await User.create({
        name: 'Demo Student',
        email: 'demo.student@sims-demo.local',
        role: ROLES.STUDENT,
        status: 'active',
        profile: {
          bio: 'Final-year Computer Science engineering student.',
          studentDetails: { studentId: 'CS-2026-DEMO', department: 'Computer Science', graduationYear: 2026, cgpa: 9.1 },
        },
      });
    }

    let alexStudent = await User.findOne({ email: 'alex.johnson@university.edu' });
    if (!alexStudent) {
      alexStudent = await User.create({
        name: 'Alex Johnson',
        email: 'alex.johnson@university.edu',
        role: ROLES.STUDENT,
        status: 'active',
        profile: {
          bio: 'Specializing in Robotics and Autonomous Systems.',
          studentDetails: { studentId: 'ROB-2026-042', department: 'Robotics Engineering', graduationYear: 2026, cgpa: 8.8 },
        },
      });
    }

    // 2. Find or pick internships
    let mlInternship = await Internship.findOne({ title: /Machine Learning/i });
    let cloudInternship = await Internship.findOne({ title: /Distributed Systems/i });
    let webInternship = await Internship.findOne({ title: /Web Development/i });
    let roboticsInternship = await Internship.findOne({ title: /Robotics/i });

    const companyUser = (await User.findOne({ role: ROLES.COMPANY })) || req.user;
    if (!mlInternship) {
      mlInternship = await Internship.create({
        title: 'Machine Learning Research Intern',
        company: companyUser._id,
        companyName: companyUser.name || 'SBIT Tech Labs',
        duration: '3 Months',
        location: 'Bengaluru / Hybrid',
        status: 'published',
      });
    }
    if (!cloudInternship) {
      cloudInternship = await Internship.create({
        title: 'Distributed Systems & Cloud Engineering Internship',
        company: companyUser._id,
        companyName: companyUser.name || 'SBIT Tech Labs',
        duration: '12 Weeks',
        location: 'Remote',
        status: 'published',
      });
    }

    // 3. Clear old demo allocations for this mentor to avoid duplicates
    await Allocation.deleteMany({
      $or: [
        { isDemo: true, mentor: mentorId },
        { notes: /Mentor Demo Allocation/i, mentor: mentorId }
      ]
    });

    const now = new Date();
    const d30Ago = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const dYesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const dFuture = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const createdAllocations = [];

    // Allocation 1: Hari (Machine Learning Research Intern) - Active, ready to assign tasks
    if (hari && mlInternship) {
      const alc1 = await Allocation.create({
        student: hari._id,
        internship: mlInternship._id,
        company: mlInternship.company || companyUser._id,
        mentor: mentorId,
        startDate: d30Ago,
        endDate: dFuture,
        status: ALLOCATION_STATUSES.ACTIVE,
        allocatedBy: mentorId,
        isDemo: true,
        notes: 'Mentor Demo Allocation: Machine Learning track with Hari.',
        completionRequest: { status: 'none' },
      });
      createdAllocations.push(alc1);
    }

    // Allocation 2: Demo Student (Full-Stack Web Development) - Ready for immediate Certificate testing!
    if (demoStudent && (webInternship || cloudInternship)) {
      const targetInt = webInternship || cloudInternship;
      const alc2 = await Allocation.create({
        student: demoStudent._id,
        internship: targetInt._id,
        company: targetInt.company || companyUser._id,
        mentor: mentorId,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-08-31'),
        status: ALLOCATION_STATUSES.ACTIVE,
        allocatedBy: mentorId,
        isDemo: true,
        notes: 'Mentor Demo Allocation: Pre-approved completion ready for certificate testing.',
        completionRequest: {
          status: 'approved',
          requestedAt: dYesterday,
          studentNotes: 'Completed all milestone tasks, unit tests, and production deployment.',
          preferredDeliveryEmail: demoStudent.email,
          reviewedAt: now,
          reviewedBy: mentorId,
          feedback: 'Outstanding milestone performance! Approved for official completion certificate.',
        },
      });

      // Also create 2 sample completed tasks
      await Task.create([
        {
          title: 'Implement OAuth2 and Session Security',
          description: 'Build robust JWT & session management with role-based access control.',
          allocation: alc2._id,
          internship: targetInt._id,
          assignedTo: demoStudent._id,
          assignedBy: mentorId,
          dueDate: dYesterday,
          status: TASK_STATUSES.COMPLETED,
          progressPercentage: 100,
          submissionNotes: 'All unit and security tests passing with 100% coverage.',
        },
        {
          title: 'Final System Documentation & API Specs',
          description: 'Document architecture, API endpoints, and production deployment guide.',
          allocation: alc2._id,
          internship: targetInt._id,
          assignedTo: demoStudent._id,
          assignedBy: mentorId,
          dueDate: now,
          status: TASK_STATUSES.COMPLETED,
          progressPercentage: 100,
          submissionNotes: 'Comprehensive OpenAPI documentation and user guide uploaded.',
        },
      ]);
      createdAllocations.push(alc2);
    }

    // Allocation 3: Alex Johnson (Robotics Track) - Active with starting and ending dates
    if (alexStudent && (roboticsInternship || cloudInternship)) {
      const targetInt = roboticsInternship || cloudInternship;
      const alc3 = await Allocation.create({
        student: alexStudent._id,
        internship: targetInt._id,
        company: targetInt.company || companyUser._id,
        mentor: mentorId,
        startDate: new Date('2026-05-15'),
        endDate: new Date('2026-11-15'),
        status: ALLOCATION_STATUSES.ACTIVE,
        allocatedBy: mentorId,
        isDemo: true,
        notes: 'Mentor Demo Allocation: Robotics & Autonomous Systems Track.',
        completionRequest: { status: 'none' },
      });
      createdAllocations.push(alc3);
    }

    const populatedAllocations = await Allocation.find({
      _id: { $in: createdAllocations.map((a) => a._id) },
    })
      .populate('student', 'name email profile')
      .populate('internship', 'title companyName duration location')
      .populate('mentor', 'name email');

    res.status(200).json({
      success: true,
      message: `Successfully prepared ${populatedAllocations.length} demo intern allocations with start and end dates.`,
      data: {
        count: populatedAllocations.length,
        allocations: populatedAllocations,
      },
    });
  } catch (err) {
    next(err);
  }
};

