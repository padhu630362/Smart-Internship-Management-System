import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  validateCreateTask,
  validateSubmitTaskProgress,
  validateReviewTask,
} from '../middlewares/validateTask.js';
import {
  createTask,
  getTasks,
  getTaskById,
  submitTaskProgress,
  reviewTask,
} from '../controllers/taskController.js';

const router = Router();

// Create and assign task
router.post(
  '/',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  validateCreateTask,
  createTask
);

// List tasks
router.get('/', authenticateToken, getTasks);

// Get single task
router.get('/:id', authenticateToken, getTaskById);

// Intern submits task progress or completion
router.patch(
  '/:id/progress',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  validateSubmitTaskProgress,
  submitTaskProgress
);

// Mentor/Company reviews task
router.patch(
  '/:id/review',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  validateReviewTask,
  reviewTask
);

export default router;
