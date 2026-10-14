import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createAnnouncement,
} from '../controllers/notificationController.js';

const router = Router();

// All notification routes require authenticated user
router.use(authenticateToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// Broadcast announcements (mentor, coordinator, admin)
router.post(
  '/announcements',
  requireRoles(ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  createAnnouncement
);

export default router;
