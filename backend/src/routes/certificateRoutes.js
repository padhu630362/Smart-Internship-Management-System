import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  getMyCertificates,
  getCertificateById,
  downloadCertificatePdf,
  verifyCertificate,
  issueAllocationCertificate,
  resendCertificateEmail,
} from '../controllers/certificateController.js';

const router = Router();

// ==========================================
// Public Verification Endpoint
// ==========================================
router.get('/verify/:code', verifyCertificate);

// ==========================================
// Protected Student & Reviewer Endpoints
// ==========================================
router.get(
  '/my',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  getMyCertificates
);

router.get(
  '/:id',
  authenticateToken,
  getCertificateById
);

router.get(
  '/:id/download',
  authenticateToken,
  downloadCertificatePdf
);

// ==========================================
// Authorized Management Endpoints (Admin, Coordinator, Mentor, Company)
// ==========================================
router.post(
  '/allocation/:allocationId/issue',
  authenticateToken,
  requireRoles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.MENTOR, ROLES.COMPANY),
  issueAllocationCertificate
);

router.post(
  '/:id/resend-email',
  authenticateToken,
  requireRoles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.MENTOR, ROLES.COMPANY),
  resendCertificateEmail
);

export default router;

