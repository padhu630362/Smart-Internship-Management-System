import { Task, TASK_STATUSES, TASK_PRIORITIES } from '../models/Task.js';
import { Allocation, ALLOCATION_STATUSES } from '../models/Allocation.js';
import { ROLES } from '../models/User.js';

export const validateCreateTask = async (req, res, next) => {
  try {
    const { title, description, allocationId, dueDate, priority } = req.body;

    if (!title || !description || !allocationId || !dueDate) {
      const error = new Error('Task title, description, allocation ID, and due date are required.');
      error.statusCode = 400;
      error.code = 'MISSING_TASK_FIELDS';
      return next(error);
    }

    const due = new Date(dueDate);
    if (isNaN(due.getTime())) {
      const error = new Error('Invalid task due date format.');
      error.statusCode = 400;
      error.code = 'INVALID_DUE_DATE';
      return next(error);
    }

    const allocation = await Allocation.findById(allocationId).populate('internship');
    if (!allocation) {
      const error = new Error('Internship allocation not found.');
      error.statusCode = 404;
      error.code = 'ALLOCATION_NOT_FOUND';
      return next(error);
    }

    if (allocation.status !== ALLOCATION_STATUSES.ACTIVE) {
      const error = new Error('Tasks can only be assigned to active internship allocations.');
      error.statusCode = 400;
      error.code = 'ALLOCATION_NOT_ACTIVE';
      return next(error);
    }

    // Authorization
    const userId = req.user.id;
    const userRole = req.user.role;
    const isCompany = allocation.company?.toString() === userId;
    let isMentor = allocation.mentor && allocation.mentor.toString() === userId;
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

    // If user is a mentor and allocation has no mentor or is demo, assign this mentor to the allocation
    if (userRole === ROLES.MENTOR && (!allocation.mentor || allocation.isDemo)) {
      allocation.mentor = userId;
      await allocation.save();
      isMentor = true;
    }

    if (!isCompany && !isMentor && !isPrivileged) {
      const error = new Error('You are not authorized to assign tasks to this intern.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_TASK_CREATION';
      return next(error);
    }

    const effectivePriority = priority || TASK_PRIORITIES.MEDIUM;
    if (!Object.values(TASK_PRIORITIES).includes(effectivePriority)) {
      const error = new Error(`Invalid priority. Choose from: ${Object.values(TASK_PRIORITIES).join(', ')}.`);
      error.statusCode = 400;
      error.code = 'INVALID_TASK_PRIORITY';
      return next(error);
    }

    req.allocation = allocation;
    req.parsedDueDate = due;
    req.effectivePriority = effectivePriority;
    next();
  } catch (err) {
    next(err);
  }
};

export const validateSubmitTaskProgress = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { progressPercentage, submissionNotes, submissionLink, status } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found.');
      error.statusCode = 404;
      error.code = 'TASK_NOT_FOUND';
      return next(error);
    }

    // Only the assigned intern can submit progress
    if (task.assignedTo.toString() !== req.user.id) {
      const error = new Error('You can only submit deliverables for tasks assigned to you.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_TASK_SUBMISSION';
      return next(error);
    }

    if (progressPercentage !== undefined) {
      const progress = Number(progressPercentage);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        const error = new Error('Progress percentage must be between 0 and 100.');
        error.statusCode = 400;
        error.code = 'INVALID_PROGRESS_PERCENTAGE';
        return next(error);
      }
    }

    if (status && ![TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.SUBMITTED].includes(status)) {
      const error = new Error("Interns can only set status to 'in_progress' or 'submitted'.");
      error.statusCode = 400;
      error.code = 'INVALID_INTERN_STATUS_TRANSITION';
      return next(error);
    }

    req.task = task;
    next();
  } catch (err) {
    next(err);
  }
};

export const validateReviewTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { status, reviewerFeedback } = req.body;

    if (!status || ![TASK_STATUSES.COMPLETED, TASK_STATUSES.REVISION_REQUESTED, TASK_STATUSES.IN_PROGRESS].includes(status)) {
      const error = new Error(
        "Valid review status required: 'completed', 'revision_requested', or 'in_progress'."
      );
      error.statusCode = 400;
      error.code = 'INVALID_REVIEW_TASK_STATUS';
      return next(error);
    }

    const task = await Task.findById(taskId).populate('allocation');
    if (!task) {
      const error = new Error('Task not found.');
      error.statusCode = 404;
      error.code = 'TASK_NOT_FOUND';
      return next(error);
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const isCompany = task.allocation?.company?.toString() === userId;
    const isMentor = task.allocation?.mentor?.toString() === userId || task.assignedBy.toString() === userId;
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

    if (!isCompany && !isMentor && !isPrivileged) {
      const error = new Error('You are not authorized to evaluate or complete this task.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_TASK_REVIEW';
      return next(error);
    }

    req.task = task;
    next();
  } catch (err) {
    next(err);
  }
};
