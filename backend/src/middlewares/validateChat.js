import mongoose from 'mongoose';
import { Conversation, CONVERSATION_TYPES } from '../models/Conversation.js';
import { User, ROLES } from '../models/User.js';

// In-memory sliding window rate limiter for chat messaging
const messageRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 60; // 60 messages / min

export const chatRateLimiter = (req, res, next) => {
  const userId = req.user?.id || req.user?._id?.toString();
  if (!userId) return next();

  const now = Date.now();
  const userTimestamps = messageRateLimitMap.get(userId) || [];

  // Filter timestamps within the current sliding window
  const activeTimestamps = userTimestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (activeTimestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    const error = new Error('Rate limit exceeded: You are sending messages too fast. Please wait a moment.');
    error.statusCode = 429;
    error.code = 'RATE_LIMIT_EXCEEDED';
    return next(error);
  }

  activeTimestamps.push(now);
  messageRateLimitMap.set(userId, activeTimestamps);

  // Periodically cleanup stale entries
  if (messageRateLimitMap.size > 2000) {
    for (const [id, timestamps] of messageRateLimitMap.entries()) {
      if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > RATE_LIMIT_WINDOW_MS) {
        messageRateLimitMap.delete(id);
      }
    }
  }

  next();
};

/**
 * Validates text message payload
 */
export const validateSendMessage = (req, res, next) => {
  const { content } = req.body;

  if (!content || typeof content !== 'string' || !content.trim()) {
    const error = new Error('Message content cannot be empty.');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    return next(error);
  }

  const trimmed = content.trim();
  if (trimmed.length > 2000) {
    const error = new Error('Message length exceeds the 2000 character maximum limit.');
    error.statusCode = 400;
    error.code = 'MESSAGE_TOO_LONG';
    return next(error);
  }

  req.sanitizedContent = trimmed;
  next();
};

/**
 * Validates direct or group conversation creation
 */
export const validateCreateConversation = async (req, res, next) => {
  try {
    const { type, name, description, participantIds } = req.body;
    const recipientId = req.body.recipientId || req.body.participantId;
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id.toString();

    const conversationType = type || CONVERSATION_TYPES.DIRECT;

    if (conversationType === CONVERSATION_TYPES.GROUP) {
      // Group creation authorized only for Admin, Coordinator, Mentor, Company
      if (userRole === ROLES.STUDENT) {
        const error = new Error('Only administrators, coordinators, and mentors can create group conversations.');
        error.statusCode = 403;
        error.code = 'FORBIDDEN_GROUP_CREATION';
        return next(error);
      }

      if (!name || typeof name !== 'string' || !name.trim()) {
        const error = new Error('Group name is required.');
        error.statusCode = 400;
        error.code = 'GROUP_NAME_REQUIRED';
        return next(error);
      }

      const trimmedName = name.trim();
      if (trimmedName.length > 100) {
        const error = new Error('Group name cannot exceed 100 characters.');
        error.statusCode = 400;
        error.code = 'GROUP_NAME_TOO_LONG';
        return next(error);
      }

      const rawParticipants = Array.isArray(participantIds) ? participantIds : [];
      const distinctMembers = [
        ...new Set([userId, ...rawParticipants.map((id) => id.toString())]),
      ];

      if (distinctMembers.length < 1) {
        const error = new Error('Group conversation requires at least 1 member.');
        error.statusCode = 400;
        error.code = 'INSUFFICIENT_PARTICIPANTS';
        return next(error);
      }

      req.validatedGroup = {
        name: trimmedName,
        description: description ? description.trim().slice(0, 300) : '',
        participants: distinctMembers,
      };
      return next();
    }

    // Direct Conversation Validation
    if (!recipientId) {
      const error = new Error('Recipient user ID is required for direct messaging.');
      error.statusCode = 400;
      error.code = 'RECIPIENT_REQUIRED';
      return next(error);
    }

    if (recipientId.toString() === userId) {
      const error = new Error('You cannot start a direct conversation with yourself.');
      error.statusCode = 400;
      error.code = 'INVALID_RECIPIENT';
      return next(error);
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      const error = new Error('Invalid recipient user ID format.');
      error.statusCode = 400;
      error.code = 'INVALID_ID_FORMAT';
      return next(error);
    }

    const recipient = await User.findById(recipientId).select('_id name role status');
    if (!recipient) {
      const error = new Error('Recipient user does not exist.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      return next(error);
    }

    if (recipient.status !== 'active') {
      const error = new Error('Cannot message deactivated or suspended accounts.');
      error.statusCode = 400;
      error.code = 'RECIPIENT_INACTIVE';
      return next(error);
    }

    req.targetRecipient = recipient;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Verifies that current user is an authorized member of the requested conversation
 */
export const requireConversationMember = async (req, res, next) => {
  try {
    const conversationId = req.params.conversationId || req.params.id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      const error = new Error('Invalid conversation ID format.');
      error.statusCode = 400;
      error.code = 'INVALID_ID_FORMAT';
      return next(error);
    }

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name email role profile')
      .populate('creator', 'name email role')
      .populate('groupAdmins', 'name email role');

    if (!conversation) {
      const error = new Error('Conversation not found.');
      error.statusCode = 404;
      error.code = 'CONVERSATION_NOT_FOUND';
      return next(error);
    }

    const userId = req.user.id || req.user._id.toString();
    const isMember = conversation.participants.some(
      (p) => (p._id || p).toString() === userId
    );

    // Privileged bypass: System Admins & Coordinators can view if needed
    const isPrivileged = req.user.role === ROLES.ADMIN || req.user.role === ROLES.COORDINATOR;

    if (!isMember && !isPrivileged) {
      const error = new Error('Access denied: You are not a member of this conversation.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_CONVERSATION_ACCESS';
      return next(error);
    }

    req.conversation = conversation;
    next();
  } catch (err) {
    next(err);
  }
};
