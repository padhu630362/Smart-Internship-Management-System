import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { getDashboardAnalytics } from '../controllers/analyticsController.js';

const router = Router();

router.use(authenticateToken);
router.get('/dashboard', getDashboardAnalytics);

export default router;
