import { Task, TASK_STATUSES, TASK_PRIORITIES } from '../models/Task.js';
import { ROLES } from '../models/User.js';
import {
  createAndDispatchNotification,
  NOTIFICATION_TYPES,
} from '../services/notificationService.js';
import { escapeRegex } from '../middlewares/sanitize.js';

/**
 * Mentor/Coordinator creates a new task for an allocated intern
 */
export const createTask = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const allocation = req.allocation;
    const due = req.parsedDueDate;
    const priority = req.effectivePriority;

    const initialHistory = {
      action: 'TASK_CREATED',
      changedBy: req.user.id,
      changedByName: req.user.name,
      timestamp: new Date(),
      status: TASK_STATUSES.TODO,
      note: 'Task initially created and assigned to intern.',
    };

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      allocation: allocation._id,
      internship: allocation.internship._id,
      assignedTo: allocation.student,
      assignedBy: req.user.id,
      dueDate: due,
      priority,
      status: TASK_STATUSES.TODO,
      history: [initialHistory],
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email profile')
      .populate('assignedBy', 'name email profile')
      .populate('internship', 'title companyName');

    // Notify assigned intern of new task
    createAndDispatchNotification({
      recipientId: allocation.student,
      senderId: req.user.id,
      type: NOTIFICATION_TYPES.TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: `You have been assigned: "${task.title}". Priority: ${priority}.`,
      link: '/tasks',
      metadata: {
        taskId: task._id,
        allocationId: allocation._id,
        priority,
      },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Task successfully created and assigned.',
      data: { task: populatedTask },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List tasks with filters (status, priority, overdue, search) and pagination
 */
export const getTasks = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const query = {};
    const userRole = req.user.role;

    if (userRole === ROLES.STUDENT) {
      query.assignedTo = req.user.id;
    } else if (userRole === ROLES.MENTOR) {
      query.$or = [{ assignedBy: req.user.id }, { 'allocation.mentor': req.user.id }];
    } else if (userRole === ROLES.COMPANY) {
      query.assignedBy = req.user.id;
    }

    if (req.query.assignedTo && userRole !== ROLES.STUDENT) {
      query.assignedTo = req.query.assignedTo;
    }

    if (req.query.allocationId) {
      query.allocation = req.query.allocationId;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.priority && req.query.priority !== 'all') {
      query.priority = req.query.priority;
    }

    if (req.query.overdue === 'true') {
      query.status = { $ne: TASK_STATUSES.COMPLETED };
      query.dueDate = { $lt: new Date() };
    }

    if (req.query.search && req.query.search.trim()) {
      const safeRegex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      const searchOr = [{ title: safeRegex }, { description: safeRegex }];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('assignedTo', 'name email profile')
        .populate('assignedBy', 'name email profile')
        .populate('internship', 'title companyName')
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        tasks,
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
 * Get single task by ID
 */
export const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email profile')
      .populate('assignedBy', 'name email profile')
      .populate('allocation')
      .populate('internship', 'title companyName');

    if (!task) {
      const error = new Error('Task not found.');
      error.statusCode = 404;
      error.code = 'TASK_NOT_FOUND';
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Intern submits task progress or deliverable
 */
export const submitTaskProgress = async (req, res, next) => {
  try {
    const task = req.task;
    const { progressPercentage, submissionNotes, submissionLink, status } = req.body;

    if (progressPercentage !== undefined) {
      task.progressPercentage = Number(progressPercentage);
    }

    if (submissionNotes !== undefined) {
      task.submissionNotes = submissionNotes.trim();
    }

    if (submissionLink !== undefined) {
      task.submissionLink = submissionLink.trim();
    }

    const targetStatus = status || (task.progressPercentage === 100 ? TASK_STATUSES.SUBMITTED : TASK_STATUSES.IN_PROGRESS);
    task.status = targetStatus;

    if (targetStatus === TASK_STATUSES.SUBMITTED) {
      task.submittedAt = new Date();
    }

    task.history.push({
      action: 'PROGRESS_UPDATED',
      changedBy: req.user.id,
      changedByName: req.user.name,
      timestamp: new Date(),
      status: targetStatus,
      note: submissionNotes ? submissionNotes.trim() : `Progress set to ${task.progressPercentage}%.`,
    });

    await task.save();

    // If intern marked progress as submitted, notify task assigner / mentor
    if (targetStatus === TASK_STATUSES.SUBMITTED && task.assignedBy) {
      createAndDispatchNotification({
        recipientId: task.assignedBy,
        senderId: req.user.id,
        type: NOTIFICATION_TYPES.TASK_FEEDBACK,
        title: 'Task Deliverable Submitted',
        message: `${req.user.name} submitted deliverables for task: "${task.title}".`,
        link: '/tasks',
        metadata: {
          taskId: task._id,
          progressPercentage: task.progressPercentage,
        },
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'Task progress submitted successfully.',
      data: { task },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mentor reviews task deliverable and updates status
 */
export const reviewTask = async (req, res, next) => {
  try {
    const task = req.task;
    const { status, reviewerFeedback } = req.body;

    task.status = status;
    task.reviewedBy = req.user.id;
    task.reviewedAt = new Date();

    if (reviewerFeedback !== undefined) {
      task.reviewerFeedback = reviewerFeedback.trim();
    }

    if (status === TASK_STATUSES.COMPLETED) {
      task.progressPercentage = 100;
    }

    task.history.push({
      action: 'TASK_REVIEWED',
      changedBy: req.user.id,
      changedByName: req.user.name,
      timestamp: new Date(),
      status,
      note: reviewerFeedback ? reviewerFeedback.trim() : `Review status set to '${status}'.`,
    });

    await task.save();

    // Notify intern that their task was reviewed
    if (task.assignedTo) {
      createAndDispatchNotification({
        recipientId: task.assignedTo,
        senderId: req.user.id,
        type: NOTIFICATION_TYPES.TASK_FEEDBACK,
        title: 'Task Review Completed',
        message: `Your task "${task.title}" has been reviewed and marked as "${status}".`,
        link: '/tasks',
        metadata: {
          taskId: task._id,
          status,
        },
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: `Task marked as '${status}'.`,
      data: { task },
    });
  } catch (err) {
    next(err);
  }
};
