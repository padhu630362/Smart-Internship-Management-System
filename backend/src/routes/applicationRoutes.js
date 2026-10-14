import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  validateSubmitApplication,
  validateStatusTransition,
  validateWithdrawApplication,
} from '../middlewares/validateApplication.js';
import {
  submitApplication,
  getMyApplications,
  withdrawApplication,
  getCompanyApplications,
  getApplicationById,
  updateApplicationStatus,
  analyzeApplicationResume,
} from '../controllers/applicationController.js';

const router = Router();

// ==========================================
// Student Application Endpoints
// ==========================================
router.post(
  '/',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  validateSubmitApplication,
  submitApplication
);

router.get(
  '/my',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  getMyApplications
);

router.patch(
  '/:id/withdraw',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  validateWithdrawApplication,
  withdrawApplication
);

// ==========================================
// AI Resume Analysis & Screening Endpoints
// ==========================================
router.post(
  '/:id/analyze-resume',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN, ROLES.STUDENT),
  analyzeApplicationResume
);

// ==========================================
// Company, Coordinator & Admin Review Endpoints
// ==========================================
router.get(
  '/',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  getCompanyApplications
);

router.get('/:id', authenticateToken, getApplicationById);

router.patch(
  '/:id/status',
  authenticateToken,
  requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  validateStatusTransition,
  updateApplicationStatus
);

export default router;
