import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.js';
import { ROLES } from '../models/User.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markConversationNotificationsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  createAnnouncement,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  sendTestNotification,
} from '../controllers/notificationController.js';

const router = Router();

// All notification routes require authenticated user
router.use(authenticateToken);

// Web Push & Desktop Notifications
router.get('/push/vapid-key', getVapidPublicKey);
router.post('/push/subscribe', subscribePush);
router.post('/push/unsubscribe', unsubscribePush);
router.post('/test-desktop', sendTestNotification);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/conversation/:conversationId/read', markConversationNotificationsRead);
router.patch('/:id/read', markAsRead);
router.delete('/', clearAllNotifications);
router.delete('/:id', deleteNotification);

// Broadcast announcements (mentor, coordinator, admin)
router.post(
  '/announcements',
  requireRoles(ROLES.MENTOR, ROLES.COORDINATOR, ROLES.ADMIN),
  createAnnouncement
);

export default router;
