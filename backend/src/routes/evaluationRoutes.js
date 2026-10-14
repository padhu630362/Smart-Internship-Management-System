import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { validateCreateEvaluation } from '../middlewares/validateEvaluation.js';
import {
  createEvaluation,
  getEvaluations,
  getEvaluationById,
  getEvaluationsByAllocation,
} from '../controllers/evaluationController.js';

const router = Router();

router.use(authenticateToken);

router.post('/', validateCreateEvaluation, createEvaluation);
router.get('/', getEvaluations);
router.get('/:id', getEvaluationById);
router.get('/allocation/:allocationId', getEvaluationsByAllocation);

export default router;
