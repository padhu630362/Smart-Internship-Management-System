import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  validateCreateAllocation,
  validateUpdateAllocationStatus,
} from '../middlewares/validateAllocation.js';
import {
  createAllocation,
  getAllocations,
  getAllocationById,
  updateAllocationStatus,
  getCompletionEligibility,
  requestCompletion,
  reviewCompletion,
  seedMentorDemoAllocations,
} from '../controllers/allocationController.js';

const router = Router();

// Seed demo allocations for testing (mentor, coordinator, admin)
router.post(
  '/seed-demo',
  authenticateToken,
  requireRoles(ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN, ROLES.COMPANY),
  seedMentorDemoAllocations
);

// Create allocation (company, mentor, coordinator, admin)
router.post(
  '/',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  validateCreateAllocation,
  createAllocation
);

// List allocations
router.get('/', authenticateToken, getAllocations);

// Completion eligibility check
router.get('/:id/completion-eligibility', authenticateToken, getCompletionEligibility);

// Student requests completion
router.post(
  '/:id/request-completion',
  authenticateToken,
  requireRoles(ROLES.STUDENT, ROLES.ADMIN),
  requestCompletion
);

// Mentor / Admin reviews completion request
router.post(
  '/:id/review-completion',
  authenticateToken,
  requireRoles(ROLES.MENTOR, ROLES.ADMIN, ROLES.COORDINATOR, ROLES.COMPANY),
  reviewCompletion
);

// View single allocation
router.get('/:id', authenticateToken, getAllocationById);

// Update status
router.patch(
  '/:id/status',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  validateUpdateAllocationStatus,
  updateAllocationStatus
);

export default router;
