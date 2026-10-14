import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import {
  chatRateLimiter,
  validateSendMessage,
  validateCreateConversation,
  requireConversationMember,
} from '../middlewares/validateChat.js';
import {
  getConversations,
  createConversation,
  getConversationById,
  getMessages,
  sendMessage,
  markConversationRead,
  updateGroupMembers,
  getContacts,
  getOnlineUsers,
} from '../controllers/chatController.js';

const router = Router();

// Gated behind JWT authentication
router.use(authenticateToken);

// Conversation management
router.get('/conversations', getConversations);
router.post('/conversations', validateCreateConversation, createConversation);
router.get('/conversations/:id', requireConversationMember, getConversationById);

// Messages in conversation
router.get('/conversations/:id/messages', requireConversationMember, getMessages);
router.post(
  '/conversations/:id/messages',
  requireConversationMember,
  chatRateLimiter,
  validateSendMessage,
  sendMessage
);

// Read receipts
router.patch('/conversations/:id/read', requireConversationMember, markConversationRead);

// Group membership updates
router.patch('/conversations/:id/members', requireConversationMember, updateGroupMembers);

// Directory of contacts and presence
router.get('/contacts', getContacts);
router.get('/online-users', getOnlineUsers);

export default router;
