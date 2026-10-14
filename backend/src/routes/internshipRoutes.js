import { Router } from 'express';
import { authenticateToken, requireRoles, optionalAuth } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  validateCreateInternship,
  validateUpdateInternship,
  checkOpportunityOwnership,
} from '../middlewares/validateInternship.js';
import {
  getPublicInternships,
  getInternshipById,
  getCompanyInternships,
  createInternship,
  updateInternship,
  updateInternshipStatus,
  deleteInternship,
  getInternshipMatchScore,
} from '../controllers/internshipController.js';

const router = Router();

// ==========================================
// Public & Student Exploration Endpoints
// ==========================================
router.get('/', optionalAuth, getPublicInternships);
router.get('/manage', authenticateToken, requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN), getCompanyInternships);
router.get('/:id', optionalAuth, getInternshipById);
router.get('/:id/match-score', authenticateToken, getInternshipMatchScore);

// ==========================================
// Company, Coordinator & Admin Management
// ==========================================
router.post(
  '/',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  validateCreateInternship,
  createInternship
);

router.put(
  '/:id',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  checkOpportunityOwnership,
  validateUpdateInternship,
  updateInternship
);

router.patch(
  '/:id/status',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  checkOpportunityOwnership,
  updateInternshipStatus
);

router.delete(
  '/:id',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  checkOpportunityOwnership,
  deleteInternship
);

export default router;
