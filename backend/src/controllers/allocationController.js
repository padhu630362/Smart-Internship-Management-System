import { Allocation, ALLOCATION_STATUSES } from '../models/Allocation.js';
import { ROLES } from '../models/User.js';
import {
  createAndDispatchNotification,
  NOTIFICATION_TYPES,
} from '../services/notificationService.js';
import { recordAuditLog } from '../services/auditService.js';

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
      link: '/allocations',
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
        link: '/allocations',
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
      query.$or = [{ mentor: req.user.id }, { company: req.user.id }];
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

    // Record regulatory audit log
    await recordAuditLog({
      action: 'ALLOCATION_STATUS_CHANGED',
      req,
      targetUser: allocation.student,
      targetResource: allocation._id,
      resourceType: 'Allocation',
      details: {
        internshipId: allocation.internship,
        previousStatus,
        newStatus: status,
        note: note ? note.trim() : undefined,
        reason: reason ? reason.trim() : undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: `Allocation status successfully changed to '${status}'.`,
      data: { allocation },
    });
  } catch (err) {
    next(err);
  }
};
