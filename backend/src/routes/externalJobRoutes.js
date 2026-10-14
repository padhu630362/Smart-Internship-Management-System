import { Router } from 'express';
import { authenticateToken, requireRoles, optionalAuth } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  getExternalJobs,
  getExternalJobById,
  toggleBookmark,
  toggleAppliedStatus,
  updateJobNotes,
  getMyInteractions,
  getPersonalizedRecommendations,
  syncExternalJobs,
} from '../controllers/externalJobController.js';

const router = Router();

// Browse & filter job listings (public with optional personalization if logged in)
router.get('/', optionalAuth, getExternalJobs);

// Student personalized recommendations sorted by AI match score
router.get(
  '/recommendations',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  getPersonalizedRecommendations
);

// Student saved & applied tracking history
router.get(
  '/my-interactions',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  getMyInteractions
);

// Manual sync trigger for live feeds
router.post(
  '/sync',
  authenticateToken,
  syncExternalJobs
);

// Single job inspection with Gemini fit breakdown
router.get('/:id', optionalAuth, getExternalJobById);

// Student interaction actions
router.post(
  '/:id/bookmark',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  toggleBookmark
);

router.post(
  '/:id/apply',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  toggleAppliedStatus
);

router.patch(
  '/:id/notes',
  authenticateToken,
  requireRoles(ROLES.STUDENT),
  updateJobNotes
);

export default router;

