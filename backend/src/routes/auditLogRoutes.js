import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import { getAuditLogs } from '../controllers/auditLogController.js';

const router = Router();

// Only system administrators can access immutable audit logs
router.get('/', authenticateToken, requireRoles(ROLES.ADMIN), getAuditLogs);

export default router;
