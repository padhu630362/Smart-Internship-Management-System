import mongoose from 'mongoose';
import { Evaluation } from '../models/Evaluation.js';
import { Allocation } from '../models/Allocation.js';
import { Notification, NOTIFICATION_TYPES } from '../models/Notification.js';
import { emitNotificationToUser } from '../socket.js';
import { ROLES } from '../models/User.js';
import { issueCertificate } from '../services/certificateService.js';

/**
 * Submit internship evaluation
 */
export const createEvaluation = async (req, res, next) => {
  try {
    const allocation = req.allocation;
    const evaluatorId = req.user.id;
    const {
      evaluationType,
      ratings,
      feedback = {},
      recommendation,
      isPassed = true,
    } = req.body;

    const newEvaluation = await Evaluation.create({
      allocation: allocation._id,
      internship: allocation.internship._id,
      student: allocation.student._id,
      evaluator: evaluatorId,
      evaluationType,
      ratings,
      feedback: {
        strengths: feedback.strengths ? feedback.strengths.trim().slice(0, 1000) : '',
        areasForImprovement: feedback.areasForImprovement
          ? feedback.areasForImprovement.trim().slice(0, 1000)
          : '',
        generalComments: feedback.generalComments
          ? feedback.generalComments.trim().slice(0, 2000)
          : '',
      },
      recommendation,
      isPassed: Boolean(isPassed),
      submittedAt: new Date(),
    });

    const populatedEvaluation = await Evaluation.findById(newEvaluation._id)
      .populate('student', 'name email profile')
      .populate('evaluator', 'name email role')
      .populate('internship', 'title companyName location')
      .populate('allocation', 'startDate endDate status');

    // Notify the student about the evaluation
    try {
      const typeLabel = evaluationType === 'mid_term' ? 'Mid-term' : 'Final';
      const notification = await Notification.create({
        recipient: allocation.student._id,
        sender: evaluatorId,
        type: NOTIFICATION_TYPES.TASK_FEEDBACK,
        title: `Internship ${typeLabel} Evaluation Submitted`,
        message: `Your ${typeLabel.toLowerCase()} evaluation for ${allocation.internship.title} has been submitted by ${req.user.name}.`,
        link: '/evaluations',
        metadata: {
          evaluationId: newEvaluation._id,
          allocationId: allocation._id,
          overallRating: populatedEvaluation.ratings?.overallRating,
        },
      });

      emitNotificationToUser(allocation.student._id, notification);
    } catch (notifErr) {
      console.warn('Could not dispatch evaluation notification:', notifErr.message);
    }

    // Auto-issue completion certificate if final evaluation is passed
    let issuedCertificate = null;
    if (evaluationType === 'final' && Boolean(isPassed)) {
      try {
        issuedCertificate = await issueCertificate({
          allocation,
          internship: populatedEvaluation.internship,
          student: populatedEvaluation.student,
          company: allocation.company,
          mentor: populatedEvaluation.evaluator,
          evaluation: populatedEvaluation,
          finalRating: populatedEvaluation.ratings?.overallRating || 4.5,
          recommendation,
        });

        // Dispatch completion certificate notification
        const certNotif = await Notification.create({
          recipient: allocation.student._id,
          sender: evaluatorId,
          type: NOTIFICATION_TYPES.CERTIFICATE_ISSUED || 'certificate_issued',
          title: 'Completion Certificate Issued!',
          message: `Congratulations! Your official completion certificate for "${allocation.internship?.title || 'Internship'}" is ready to view and download.`,
          link: '/certificates',
          metadata: {
            certificateId: issuedCertificate._id,
            certificateNumber: issuedCertificate.certificateNumber,
            verificationCode: issuedCertificate.verificationCode,
          },
        });
        emitNotificationToUser(allocation.student._id, certNotif);
      } catch (certErr) {
        console.warn('Could not auto-issue certificate:', certErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Internship evaluation recorded successfully.',
      data: {
        evaluation: populatedEvaluation,
        certificate: issuedCertificate,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List evaluations with role-based visibility and filters
 */
export const getEvaluations = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const { allocationId, studentId, evaluationType, page = 1, limit = 20 } = req.query;

    const query = {};

    // Scoped queries by role
    if (userRole === ROLES.STUDENT) {
      query.student = userId;
    } else if (userRole === ROLES.MENTOR) {
      // Find all allocations mentored by this user
      const allocations = await Allocation.find({ mentor: userId }).select('_id');
      const allocIds = allocations.map((a) => a._id);
      query.$or = [{ evaluator: userId }, { allocation: { $in: allocIds } }];
    } else if (userRole === ROLES.COMPANY) {
      // Find all allocations for this company
      const allocations = await Allocation.find({ company: userId }).select('_id');
      const allocIds = allocations.map((a) => a._id);
      query.$or = [{ evaluator: userId }, { allocation: { $in: allocIds } }];
    }

    if (allocationId && mongoose.Types.ObjectId.isValid(allocationId)) {
      query.allocation = allocationId;
    }

    if (studentId && mongoose.Types.ObjectId.isValid(studentId) && userRole !== ROLES.STUDENT) {
      query.student = studentId;
    }

    if (evaluationType) {
      query.evaluationType = evaluationType;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [evaluations, total] = await Promise.all([
      Evaluation.find(query)
        .populate('student', 'name email profile')
        .populate('evaluator', 'name email role')
        .populate('internship', 'title companyName location')
        .populate('allocation', 'startDate endDate status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Evaluation.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        evaluations,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get evaluation by ID with security check
 */
export const getEvaluationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid evaluation ID format.');
      error.statusCode = 400;
      return next(error);
    }

    const evaluation = await Evaluation.findById(id)
      .populate('student', 'name email profile')
      .populate('evaluator', 'name email role')
      .populate('internship', 'title companyName location duration')
      .populate('allocation', 'startDate endDate status');

    if (!evaluation) {
      const error = new Error('Evaluation not found.');
      error.statusCode = 404;
      return next(error);
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    // Security check: student can only view their own evaluation
    if (userRole === ROLES.STUDENT && evaluation.student._id.toString() !== userId) {
      const error = new Error('Access denied: You cannot view evaluations belonging to other students.');
      error.statusCode = 403;
      return next(error);
    }

    // Security check: mentor/company check
    if (userRole === ROLES.MENTOR && evaluation.evaluator._id.toString() !== userId) {
      const allocation = await Allocation.findById(evaluation.allocation);
      if (allocation?.mentor?.toString() !== userId) {
        const error = new Error('Access denied: You are not authorized to view this evaluation.');
        error.statusCode = 403;
        return next(error);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        evaluation,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get evaluations for a specific allocation
 */
export const getEvaluationsByAllocation = async (req, res, next) => {
  try {
    const { allocationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(allocationId)) {
      const error = new Error('Invalid allocation ID format.');
      error.statusCode = 400;
      return next(error);
    }

    const allocation = await Allocation.findById(allocationId);
    if (!allocation) {
      const error = new Error('Allocation not found.');
      error.statusCode = 404;
      return next(error);
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    // Student security
    if (userRole === ROLES.STUDENT && allocation.student.toString() !== userId) {
      const error = new Error('Access denied: You are not authorized to view evaluations for this allocation.');
      error.statusCode = 403;
      return next(error);
    }

    const evaluations = await Evaluation.find({ allocation: allocationId })
      .populate('evaluator', 'name email role')
      .populate('student', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        evaluations,
        midTerm: evaluations.find((e) => e.evaluationType === 'mid_term') || null,
        final: evaluations.find((e) => e.evaluationType === 'final') || null,
      },
    });
  } catch (err) {
    next(err);
  }
};
