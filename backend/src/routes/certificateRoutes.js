import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  getMyCertificates,
  getCertificateById,
  downloadCertificatePdf,
  verifyCertificate,
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

export default router;

