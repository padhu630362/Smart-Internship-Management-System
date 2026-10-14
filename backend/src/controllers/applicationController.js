import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Application, APPLICATION_STATUSES } from '../models/Application.js';
import { Internship } from '../models/Internship.js';
import { ROLES } from '../models/User.js';
import {
  createAndDispatchNotification,
  NOTIFICATION_TYPES,
} from '../services/notificationService.js';
import { recordAuditLog } from '../services/auditService.js';
import { escapeRegex } from '../middlewares/sanitize.js';
import { extractResumeText, analyzeResumeWithGemini } from '../services/aiService.js';
import { UPLOAD_DIR } from '../utils/fileUpload.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Student submits application for an internship opportunity.
 */
export const submitApplication = async (req, res, next) => {
  try {
    const { coverLetter, resumeFileName } = req.body;
    const internship = req.internship;
    const user = req.user;

    const studentSnapshot = {
      name: user.name,
      email: user.email,
      phone: user.profile?.phone || '',
      studentId: user.profile?.studentDetails?.studentId || '',
      department: user.profile?.studentDetails?.department || '',
      course: user.profile?.studentDetails?.course || '',
      graduationYear: user.profile?.studentDetails?.graduationYear || null,
      cgpa: user.profile?.studentDetails?.cgpa || null,
      skills: user.profile?.studentDetails?.skills || [],
      linkedinUrl: user.profile?.studentDetails?.linkedinUrl || '',
      githubUrl: user.profile?.studentDetails?.githubUrl || '',
      portfolioUrl: user.profile?.studentDetails?.portfolioUrl || '',
    };

    const initialHistoryEntry = {
      status: APPLICATION_STATUSES.SUBMITTED,
      changedBy: user.id,
      changedByName: user.name,
      changedAt: new Date(),
      note: 'Initial application submitted by student.',
    };

    // Extract resume text if document exists on disk
    let resumeText = '';
    const resumeFilename = req.effectiveResumeUrl ? req.effectiveResumeUrl.split('/').pop() : null;
    if (resumeFilename) {
      const filePath = path.join(UPLOAD_DIR, resumeFilename);
      if (fs.existsSync(filePath)) {
        resumeText = await extractResumeText(filePath);
      }
    }

    // Perform AI Resume Analysis & Skill Matching
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzeResumeWithGemini({
        resumeText,
        studentProfile: studentSnapshot,
        internship,
      });
    } catch (aiErr) {
      logger.warn(`AI Analysis failed on submit: ${aiErr.message}`);
    }

    const newApplication = await Application.create({
      internship: internship._id,
      student: user.id,
      company: internship.company,
      status: APPLICATION_STATUSES.SUBMITTED,
      coverLetter: coverLetter ? coverLetter.trim() : '',
      resumeUrl: req.effectiveResumeUrl,
      resumeFileName:
        resumeFileName ||
        user.profile?.studentDetails?.resumeFileName ||
        'Official_Student_Resume.pdf',
      studentSnapshot,
      aiAnalysis: aiAnalysis || undefined,
      statusHistory: [initialHistoryEntry],
    });

    // Safely increment application counter on internship
    await Internship.findByIdAndUpdate(internship._id, {
      $inc: { applicationsCount: 1 },
    });

    // Notify company of new application submission
    createAndDispatchNotification({
      recipientId: internship.company,
      senderId: user.id,
      type: NOTIFICATION_TYPES.APPLICATION_SUBMITTED,
      title: 'New Application Received',
      message: `${user.name} submitted an application for "${internship.title}".`,
      link: '/applications',
      metadata: {
        applicationId: newApplication._id,
        internshipId: internship._id,
        studentName: user.name,
      },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      data: { application: newApplication },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Student views their own application history.
 */
export const getMyApplications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = { student: req.user.id };

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const [applications, total, stats] = await Promise.all([
      Application.find(query)
        .populate('internship', 'title companyName location workMode stipend duration applicationDeadline status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments(query),
      Application.aggregate([
        { $match: { student: req.user._id } },
        {
          $group: {
            _id: null,
            totalApplied: { $sum: 1 },
            submittedCount: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
            underReviewCount: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
            shortlistedCount: { $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] } },
            interviewCount: { $sum: { $cond: [{ $eq: ['$status', 'interview'] }, 1, 0] } },
            selectedCount: { $sum: { $cond: [{ $eq: ['$status', 'selected'] }, 1, 0] } },
            rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            withdrawnCount: { $sum: { $cond: [{ $eq: ['$status', 'withdrawn'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const aggregateStats = stats[0] || {
      totalApplied: 0,
      submittedCount: 0,
      underReviewCount: 0,
      shortlistedCount: 0,
      interviewCount: 0,
      selectedCount: 0,
      rejectedCount: 0,
      withdrawnCount: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
        stats: aggregateStats,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Student withdraws their own application.
 */
export const withdrawApplication = async (req, res, next) => {
  try {
    const application = req.application;
    const { reason } = req.body;

    application.status = APPLICATION_STATUSES.WITHDRAWN;

    application.statusHistory.push({
      status: APPLICATION_STATUSES.WITHDRAWN,
      changedBy: req.user.id,
      changedByName: req.user.name,
      changedAt: new Date(),
      note: reason ? reason.trim() : 'Withdrawn by student.',
      reason: reason ? reason.trim() : 'Voluntary withdrawal',
    });

    await application.save();

    // Decrement active applications counter on internship
    await Internship.findByIdAndUpdate(application.internship, {
      $inc: { applicationsCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully.',
      data: { application },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reviewer/Company views applicants across their opportunities.
 */
export const getCompanyApplications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = {};
    const userRole = req.user.role;

    // Company isolation: companies can only see their own applications
    if (userRole === ROLES.COMPANY || userRole === ROLES.MENTOR) {
      query.company = req.user.id;
    } else if ((userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR) && req.query.companyId) {
      query.company = req.query.companyId;
    }

    if (req.query.internshipId) {
      query.internship = req.query.internshipId;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    // Search query
    const searchTerm = req.query.search || req.query.q;
    if (searchTerm && searchTerm.trim()) {
      const regex = new RegExp(escapeRegex(searchTerm.trim()), 'i');
      query.$or = [
        { 'studentSnapshot.name': regex },
        { 'studentSnapshot.email': regex },
        { 'studentSnapshot.studentId': regex },
        { 'studentSnapshot.department': regex },
      ];
    }

    const statsMatch = (userRole === ROLES.COMPANY || userRole === ROLES.MENTOR)
      ? { company: req.user._id }
      : {};

    const [applications, total, stats] = await Promise.all([
      Application.find(query)
        .populate('internship', 'title location workMode openings applicationDeadline')
        .populate('student', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments(query),
      Application.aggregate([
        { $match: statsMatch },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            submittedCount: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
            underReviewCount: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
            shortlistedCount: { $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] } },
            interviewCount: { $sum: { $cond: [{ $eq: ['$status', 'interview'] }, 1, 0] } },
            selectedCount: { $sum: { $cond: [{ $eq: ['$status', 'selected'] }, 1, 0] } },
            rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            withdrawnCount: { $sum: { $cond: [{ $eq: ['$status', 'withdrawn'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const aggregateStats = stats[0] || {
      totalCount: 0,
      submittedCount: 0,
      underReviewCount: 0,
      shortlistedCount: 0,
      interviewCount: 0,
      selectedCount: 0,
      rejectedCount: 0,
      withdrawnCount: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
        stats: aggregateStats,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve single application with full student snapshot and audit history.
 */
export const getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('internship')
      .populate('student', 'name email profile')
      .populate('reviewedBy', 'name email');

    if (!application) {
      const error = new Error('Application not found.');
      error.statusCode = 404;
      error.code = 'APPLICATION_NOT_FOUND';
      return next(error);
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    const isStudentApplicant = application.student._id.toString() === userId;
    const isCompanyOwner = application.company.toString() === userId;
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

    if (!isStudentApplicant && !isCompanyOwner && !isPrivileged) {
      const error = new Error('Access denied: You are not authorized to view this application.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_APPLICATION_ACCESS';
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: { application },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reviewer updates application status with audit trail recording.
 */
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const application = req.application;
    const { status: targetStatus, reviewNotes, interviewDetails } = req.body;

    const previousStatus = application.status;
    application.status = targetStatus;
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();

    if (reviewNotes !== undefined) {
      application.reviewNotes = reviewNotes.trim();
    }

    if (req.finalReason) {
      application.decisionReason = req.finalReason.trim();
    }

    if (interviewDetails) {
      application.interviewDetails = {
        scheduledAt: interviewDetails.scheduledAt ? new Date(interviewDetails.scheduledAt) : undefined,
        meetingLink: interviewDetails.meetingLink?.trim() || '',
        location: interviewDetails.location?.trim() || '',
        instructions: interviewDetails.instructions?.trim() || '',
      };
    }

    // Append to audit trail
    application.statusHistory.push({
      status: targetStatus,
      changedBy: req.user.id,
      changedByName: req.user.name,
      changedAt: new Date(),
      note: reviewNotes ? reviewNotes.trim() : `Status changed from '${previousStatus}' to '${targetStatus}'.`,
      reason: req.finalReason ? req.finalReason.trim() : undefined,
    });

    await application.save();

    // Record decision audit log
    await recordAuditLog({
      action: 'APPLICATION_DECISION',
      req,
      targetUser: application.student,
      targetResource: application._id,
      resourceType: 'Application',
      details: {
        internshipId: application.internship,
        previousStatus,
        newStatus: targetStatus,
        reviewNotes: reviewNotes ? reviewNotes.trim() : undefined,
        reason: req.finalReason ? req.finalReason.trim() : undefined,
      },
    });

    // Notify applicant student of status change
    const internshipTitle =
      application.internship?.title || 'internship';
    const statusLabel = targetStatus.replace(/_/g, ' ');

    createAndDispatchNotification({
      recipientId: application.student,
      senderId: req.user.id,
      type: NOTIFICATION_TYPES.APPLICATION_STATUS,
      title: 'Application Status Updated',
      message: `Your application for "${internshipTitle}" has been updated to "${statusLabel}".`,
      link: '/applications',
      metadata: {
        applicationId: application._id,
        newStatus: targetStatus,
        previousStatus,
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Application status changed to '${targetStatus}'.`,
      data: { application },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Triggers or re-runs AI resume analysis for a specific application.
 * Accessible by company, mentor, coordinator, admin, and applicant student.
 */
export const analyzeApplicationResume = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const application = await Application.findById(applicationId).populate('internship');

    if (!application) {
      const error = new Error('Application not found.');
      error.statusCode = 404;
      error.code = 'APPLICATION_NOT_FOUND';
      return next(error);
    }

    // Role verification: student can only trigger for their own application
    if (req.user.role === ROLES.STUDENT && application.student.toString() !== req.user.id) {
      const error = new Error('You do not have permission to analyze this application.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    // Company can only analyze applications submitted for their internships
    if (req.user.role === ROLES.COMPANY && application.company.toString() !== req.user.id) {
      const error = new Error('You do not have permission to analyze applications for other companies.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    let resumeText = '';
    const resumeFilename = application.resumeUrl ? application.resumeUrl.split('/').pop() : null;
    if (resumeFilename) {
      const filePath = path.join(UPLOAD_DIR, resumeFilename);
      if (fs.existsSync(filePath)) {
        resumeText = await extractResumeText(filePath);
      }
    }

    const aiAnalysis = await analyzeResumeWithGemini({
      resumeText,
      studentProfile: application.studentSnapshot,
      internship: application.internship,
    });

    application.aiAnalysis = aiAnalysis;
    await application.save();

    res.status(200).json({
      success: true,
      message: 'AI resume analysis completed successfully.',
      data: { aiAnalysis },
    });
  } catch (err) {
    next(err);
  }
};

