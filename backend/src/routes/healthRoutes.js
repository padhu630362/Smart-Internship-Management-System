import { Router } from 'express';
import { getHealth, getDatabaseHealth } from '../controllers/healthController.js';

const router = Router();

// Fast liveness and system diagnostic endpoint
router.get('/', getHealth);

// Explicit database readiness probe with timeout
router.get('/db', getDatabaseHealth);

export default router;
