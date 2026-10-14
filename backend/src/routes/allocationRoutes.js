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
} from '../controllers/allocationController.js';

const router = Router();

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
