import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  getMyCertificates,
  getCertificateById,
  downloadCertificatePdf,
  verifyCertificate,
  getCertificatePreview,
  issueAllocationCertificate,
  resendCertificateEmail,
  getAdminCertificateAudit,
  getAdminMentorIssuanceStats,
  seedDemoAdminEndpoint,
} from '../controllers/certificateController.js';

const router = Router();

// ==========================================
// Public Verification Endpoint
// ==========================================
router.get('/verify/:code', verifyCertificate);

// ==========================================
// Admin & Coordinator Audit / Reporting / Demo
// (Must be defined before /:id routes)
// ==========================================
router.get(
  '/admin/audit',
  authenticateToken,
  requireRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  getAdminCertificateAudit
);

router.get(
  '/admin/mentor-stats',
  authenticateToken,
  requireRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  getAdminMentorIssuanceStats
);

router.post(
  '/admin/seed-demo',
  authenticateToken,
  requireRoles(ROLES.ADMIN),
  seedDemoAdminEndpoint
);

// ==========================================
// Allocation Certificate Preview & Issuance
// ==========================================
router.get(
  '/allocation/:allocationId/preview',
  authenticateToken,
  requireRoles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.MENTOR, ROLES.COMPANY),
  getCertificatePreview
);

router.post(
  '/allocation/:allocationId/issue',
  authenticateToken,
  requireRoles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.MENTOR, ROLES.COMPANY),
  issueAllocationCertificate
);

// ==========================================
// Student Certificates
// ==========================================
router.get(
  '/my',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  getMyCertificates
);

// ==========================================
// Parameterized Certificate ID Endpoints
// ==========================================
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

router.post(
  '/:id/resend-email',
  authenticateToken,
  requireRoles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.MENTOR, ROLES.COMPANY),
  resendCertificateEmail
);

export default router;
