import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import { getReportData, exportReportCSV } from '../controllers/reportController.js';
import { exportRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles(ROLES.COMPANY, ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN));

router.get('/', getReportData);
router.get('/export', exportRateLimiter, exportReportCSV);

export default router;
