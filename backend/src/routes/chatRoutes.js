import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import {
  chatRateLimiter,
  validateSendMessage,
  validateEditMessage,
  validateDeleteMessage,
  validateCreateConversation,
  requireConversationMember,
} from '../middlewares/validateChat.js';
import { uploadChatAttachment } from '../utils/chatFileUpload.js';
import {
  getConversations,
  createConversation,
  getConversationById,
  getMessages,
  sendMessage,
  uploadAttachment,
  downloadAttachment,
  editMessage,
  deleteMessage,
  forwardMessage,
  markConversationRead,
  updateGroupMembers,
  getContacts,
  getOnlineUsers,
  simulatePartnerReply,
  toggleMessageReaction,
} from '../controllers/chatController.js';

const router = Router();

// Gated behind JWT authentication
router.use(authenticateToken);

// Conversation management
router.get('/conversations', getConversations);
router.post('/conversations', validateCreateConversation, createConversation);
router.get('/conversations/:id', requireConversationMember, getConversationById);

// Direct attachment upload endpoint
router.post('/upload', uploadChatAttachment.single('file'), uploadAttachment);

// Secure authenticated attachment stream download
router.get('/attachments/:fileKey', downloadAttachment);

// Messages in conversation (supports multipart attachments or JSON)
router.get('/conversations/:id/messages', requireConversationMember, getMessages);
router.post(
  '/conversations/:id/messages',
  requireConversationMember,
  chatRateLimiter,
  uploadChatAttachment.any(),
  validateSendMessage,
  sendMessage
);

// Message operations
router.patch('/messages/:messageId', validateEditMessage, editMessage);
router.delete('/messages/:messageId', validateDeleteMessage, deleteMessage);
router.post('/messages/:messageId/forward', forwardMessage);
router.patch('/messages/:messageId/react', toggleMessageReaction);

// Real-time live exchange simulation endpoint
router.post(
  '/conversations/:id/simulate-reply',
  requireConversationMember,
  simulatePartnerReply
);

// Read receipts
router.patch('/conversations/:id/read', requireConversationMember, markConversationRead);

// Group membership updates
router.patch('/conversations/:id/members', requireConversationMember, updateGroupMembers);

// Directory of contacts and presence
router.get('/contacts', getContacts);
router.get('/online-users', getOnlineUsers);

export default router;
