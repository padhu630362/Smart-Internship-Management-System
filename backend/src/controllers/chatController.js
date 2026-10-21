import mongoose from 'mongoose';
import { Conversation, CONVERSATION_TYPES } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User, ROLES, USER_STATUSES } from '../models/User.js';
import { Allocation } from '../models/Allocation.js';
import { Application } from '../models/Application.js';
import {
  emitChatMessage,
  emitConversationUpdated,
  emitReadReceipt,
  emitNotificationReadToUser,
  emitMessageReaction,
  getOnlineUserIds,
} from '../socket.js';
import { Notification } from '../models/Notification.js';
import {
  createAndDispatchNotification,
  NOTIFICATION_TYPES,
} from '../services/notificationService.js';
import { logger } from '../utils/logger.js';

/**
 * List all conversations for the authenticated user with unread counts
 */
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name email role profile')
      .populate('creator', 'name email role')
      .populate('groupAdmins', 'name email role')
      .populate({
        path: 'lastMessage',
        select: 'content sender createdAt isDeleted',
        populate: { path: 'sender', select: 'name email role' },
      })
      .sort({ lastMessageAt: -1 })
      .lean();

    // Calculate unread message counts for each conversation
    const onlineIds = new Set(getOnlineUserIds());

    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Find user's lastReadAt timestamp
        const receipt = (conv.readReceipts || []).find(
          (r) => r.user?.toString() === userId
        );
        const lastReadAt = receipt ? new Date(receipt.lastReadAt) : new Date(0);

        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          createdAt: { $gt: lastReadAt },
          isDeleted: false,
        });

        // For direct chats, calculate partner's online status
        let isPartnerOnline = false;
        let partner = null;
        if (conv.type === CONVERSATION_TYPES.DIRECT) {
          partner = conv.participants.find((p) => p._id?.toString() !== userId);
          if (partner && onlineIds.has(partner._id?.toString())) {
            isPartnerOnline = true;
          }
        }

        return {
          ...conv,
          unreadCount,
          isPartnerOnline,
          partner,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        conversations: enrichedConversations,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new direct or group conversation
 */
export const createConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type = CONVERSATION_TYPES.DIRECT } = req.body;

    if (type === CONVERSATION_TYPES.GROUP) {
      const { name, description, participants } = req.validatedGroup;

      const readReceipts = participants.map((pId) => ({
        user: pId,
        lastReadAt: pId === userId ? new Date() : new Date(0),
      }));

      const newGroup = await Conversation.create({
        type: CONVERSATION_TYPES.GROUP,
        name,
        description: description || '',
        participants,
        groupAdmins: [userId],
        creator: userId,
        readReceipts,
        lastMessageAt: new Date(),
      });

      const populatedGroup = await Conversation.findById(newGroup._id)
        .populate('participants', 'name email role profile')
        .populate('creator', 'name email role')
        .populate('groupAdmins', 'name email role');

      emitConversationUpdated(populatedGroup._id, populatedGroup, participants);

      return res.status(201).json({
        success: true,
        message: 'Group conversation created successfully.',
        data: { conversation: populatedGroup },
      });
    }

    // Direct Conversation
    const targetRecipient = req.targetRecipient;
    const recipientId = targetRecipient._id.toString();

    // Check if direct conversation already exists between the two users
    let directConv = await Conversation.findOne({
      type: CONVERSATION_TYPES.DIRECT,
      participants: { $all: [userId, recipientId], $size: 2 },
    })
      .populate('participants', 'name email role profile')
      .populate({
        path: 'lastMessage',
        select: 'content sender createdAt',
        populate: { path: 'sender', select: 'name email role' },
      });

    if (directConv) {
      return res.status(200).json({
        success: true,
        message: 'Existing direct conversation retrieved.',
        data: { conversation: directConv },
      });
    }

    // Create new direct conversation
    const newConv = await Conversation.create({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [userId, recipientId],
      creator: userId,
      readReceipts: [
        { user: userId, lastReadAt: new Date() },
        { user: recipientId, lastReadAt: new Date(0) },
      ],
      lastMessageAt: new Date(),
    });

    directConv = await Conversation.findById(newConv._id).populate(
      'participants',
      'name email role profile'
    );

    emitConversationUpdated(directConv._id, directConv, [userId, recipientId]);

    res.status(201).json({
      success: true,
      message: 'Direct conversation started successfully.',
      data: { conversation: directConv },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve single conversation details
 */
export const getConversationById = async (req, res, next) => {
  try {
    const conversation = req.conversation;
    const userId = req.user.id;

    // Calculate unread count
    const receipt = (conversation.readReceipts || []).find(
      (r) => r.user?.toString() === userId
    );
    const lastReadAt = receipt ? new Date(receipt.lastReadAt) : new Date(0);

    const unreadCount = await Message.countDocuments({
      conversation: conversation._id,
      sender: { $ne: userId },
      createdAt: { $gt: lastReadAt },
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      data: {
        conversation,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get paginated messages for a conversation
 */
export const getMessages = async (req, res, next) => {
  try {
    const conversationId = req.conversation._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const query = {
      conversation: conversationId,
      isDeleted: false,
    };

    const [messagesDesc, total] = await Promise.all([
      Message.find(query)
        .populate('sender', 'name email role profile')
        .populate('reactions.user', 'name role profile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(query),
    ]);

    // Reverse to display in chronological order
    const messages = messagesDesc.reverse();

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Send a new text message in conversation
 */
export const sendMessage = async (req, res, next) => {
  try {
    const conversation = req.conversation;
    const userId = req.user.id;
    const content = req.sanitizedContent;

    const newMessage = await Message.create({
      conversation: conversation._id,
      sender: userId,
      content,
      readBy: [userId],
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name email role profile')
      .lean();

    // Update conversation last message timestamp & sender read receipt
    const now = new Date();
    await Conversation.findByIdAndUpdate(conversation._id, {
      $set: {
        lastMessage: newMessage._id,
        lastMessageAt: now,
      },
    });

    // Update sender's readReceipt in conversation
    await Conversation.updateOne(
      { _id: conversation._id, 'readReceipts.user': userId },
      { $set: { 'readReceipts.$.lastReadAt': now } }
    );

    // Real-time Socket.IO emission to room and individual user rooms
    emitChatMessage(conversation._id, populatedMessage, conversation.participants);

    // Dispatch real-time in-app notification to all other participants
    for (const participantId of conversation.participants) {
      const pIdStr = (participantId._id || participantId).toString();
      if (pIdStr !== userId.toString()) {
        createAndDispatchNotification({
          recipientId: pIdStr,
          senderId: userId,
          type: NOTIFICATION_TYPES.NEW_MESSAGE,
          title: `New message from ${req.user.name}`,
          message: content.length > 80 ? `${content.substring(0, 77)}...` : content,
          link: `/chat?conversationId=${conversation._id}`,
          eventKey: `MSG:${newMessage._id}:${pIdStr}`,
          metadata: {
            conversationId: conversation._id,
            messageId: newMessage._id,
          },
        }).catch((err) => logger.warn(`Failed to dispatch message notification: ${err.message}`));
      }
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      data: { message: populatedMessage },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Simulate a real-time reply from the other participant in a conversation.
 * Emits live typing indicator, socket message, audio trigger, and in-app notification.
 */
export const simulatePartnerReply = async (req, res, next) => {
  try {
    const conversation = req.conversation;
    const currentUserId = req.user.id.toString();

    // Identify the colleague/partner
    const partnerId = conversation.participants.find(
      (p) => (p._id || p).toString() !== currentUserId
    );

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        error: { message: 'No other participant found in this conversation.' },
      });
    }

    const partner = await User.findById(partnerId._id || partnerId).select(
      'name email role profile'
    );
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation partner account not found.' },
      });
    }

    const sampleReplies = [
      `Hi ${req.user.name}, received your message. Real-time chat & notifications are working seamlessly!`,
      `Hello ${req.user.name}! I am reviewing your updates right now. Everything is approved.`,
      `Confirmed! Live socket delivery is active. Let me know if you need any additional assistance.`,
      `Thanks for the update, ${req.user.name}. The institutional dashboard and reports have been synced.`,
    ];

    const replyText =
      req.body?.customMessage?.trim() ||
      sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

    // 1. Emit live typing indicator for partner
    const { getIO, emitChatMessage } = await import('../socket.js');
    const io = getIO();
    if (io) {
      io.to(`conversation:${conversation._id}`).emit('chat:typing', {
        conversationId: conversation._id.toString(),
        userId: partner._id.toString(),
        userName: partner.name,
        isTyping: true,
      });
    }

    // 2. Wait 1200ms for realistic live typing indicator, then broadcast real message
    setTimeout(async () => {
      try {
        if (io) {
          io.to(`conversation:${conversation._id}`).emit('chat:typing', {
            conversationId: conversation._id.toString(),
            userId: partner._id.toString(),
            userName: partner.name,
            isTyping: false,
          });
        }

        const now = new Date();
        const newMessage = await Message.create({
          conversation: conversation._id,
          sender: partner._id,
          content: replyText,
          readBy: [partner._id],
        });

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'name email role profile')
          .lean();

        await Conversation.findByIdAndUpdate(conversation._id, {
          $set: {
            lastMessage: newMessage._id,
            lastMessageAt: now,
          },
        });

        emitChatMessage(conversation._id, populatedMessage, conversation.participants);

        // Dispatch real-time in-app notification to the current user
        createAndDispatchNotification({
          recipientId: currentUserId,
          senderId: partner._id,
          type: NOTIFICATION_TYPES.NEW_MESSAGE,
          title: `New message from ${partner.name}`,
          message: replyText.length > 80 ? `${replyText.substring(0, 77)}...` : replyText,
          link: `/chat?conversationId=${conversation._id}`,
          eventKey: `MSG:${newMessage._id}:${currentUserId}`,
          metadata: {
            conversationId: conversation._id,
            messageId: newMessage._id,
          },
        }).catch((err) =>
          logger.warn(`Failed to dispatch simulated message notification: ${err.message}`)
        );
      } catch (innerErr) {
        logger.error(`Error in simulated message broadcast: ${innerErr.message}`);
      }
    }, 1200);

    res.status(200).json({
      success: true,
      message: `Simulated live message exchange initiated from ${partner.name}.`,
      data: { partner: { id: partner._id, name: partner.name, role: partner.role } },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark conversation as read for current user
 */
export const markConversationRead = async (req, res, next) => {
  try {
    const conversationId = req.conversation._id;
    const userId = req.user.id;
    const now = new Date();

    // Update read receipt in conversation
    const updateResult = await Conversation.updateOne(
      { _id: conversationId, 'readReceipts.user': userId },
      { $set: { 'readReceipts.$.lastReadAt': now } }
    );

    // If receipt entry didn't exist, push it
    if (updateResult.matchedCount === 0) {
      await Conversation.updateOne(
        { _id: conversationId },
        { $push: { readReceipts: { user: userId, lastReadAt: now } } }
      );
    }

    // Add current user to readBy in messages
    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    emitReadReceipt(conversationId, userId, now, req.conversation.participants);

    // Also mark all in-app notifications for this conversation as read
    // Delete in-app message notifications for this conversation since messages have been checked
    await Notification.deleteMany({
      recipient: userId,
      $or: [
        { 'metadata.conversationId': conversationId },
        { link: { $regex: conversationId.toString() } },
      ],
    });

    const remainingUnreadNotifs = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    emitNotificationReadToUser(userId, {
      conversationId: conversationId.toString(),
      unreadCount: remainingUnreadNotifs,
      deleted: true,
    });

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read.',
      data: { conversationId, lastReadAt: now, unreadCount: 0 },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Manage group conversation members and name
 */
export const updateGroupMembers = async (req, res, next) => {
  try {
    const conversation = req.conversation;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (conversation.type !== CONVERSATION_TYPES.GROUP) {
      const error = new Error('Member management is only available for group conversations.');
      error.statusCode = 400;
      error.code = 'INVALID_CONVERSATION_TYPE';
      return next(error);
    }

    // Authorization: Only group creator, group admin, or system admin/coordinator can manage group
    const isCreator = conversation.creator?.toString() === userId;
    const isGroupAdmin = conversation.groupAdmins?.some(
      (a) => (a._id || a).toString() === userId
    );
    const isSystemAdmin = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

    if (!isCreator && !isGroupAdmin && !isSystemAdmin) {
      const error = new Error('Access denied: Only group administrators can manage group members.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_GROUP_ADMIN';
      return next(error);
    }

    const { name, description, addMemberIds, removeMemberIds, action, userId: targetMemberId } = req.body;

    if (name && name.trim()) {
      conversation.name = name.trim().slice(0, 100);
    }

    if (description !== undefined) {
      conversation.description = description.trim().slice(0, 300);
    }

    let currentParticipants = conversation.participants.map((p) =>
      (p._id || p).toString()
    );

    const toAdd = Array.isArray(addMemberIds) ? [...addMemberIds] : [];
    if (action === 'add' && targetMemberId) {
      toAdd.push(targetMemberId);
    }

    const toRemove = Array.isArray(removeMemberIds) ? [...removeMemberIds] : [];
    if (action === 'remove' && targetMemberId) {
      toRemove.push(targetMemberId);
    }

    // Add members
    if (toAdd.length > 0) {
      for (const newId of toAdd) {
        if (mongoose.Types.ObjectId.isValid(newId)) {
          const idStr = newId.toString();
          if (!currentParticipants.includes(idStr)) {
            currentParticipants.push(idStr);
            conversation.readReceipts.push({ user: idStr, lastReadAt: new Date(0) });
          }
        }
      }
    }

    // Remove members
    if (toRemove.length > 0) {
      const removeSet = new Set(toRemove.map((id) => id.toString()));
      currentParticipants = currentParticipants.filter((id) => !removeSet.has(id));
      conversation.readReceipts = conversation.readReceipts.filter(
        (r) => !removeSet.has(r.user?.toString())
      );
    }

    if (currentParticipants.length < 1) {
      const error = new Error('A group conversation must have at least 1 member.');
      error.statusCode = 400;
      error.code = 'INSUFFICIENT_PARTICIPANTS';
      return next(error);
    }

    conversation.participants = currentParticipants;
    await conversation.save();

    const updatedConv = await Conversation.findById(conversation._id)
      .populate('participants', 'name email role profile')
      .populate('creator', 'name email role')
      .populate('groupAdmins', 'name email role');

    emitConversationUpdated(conversation._id, updatedConv, currentParticipants);

    res.status(200).json({
      success: true,
      message: 'Group updated successfully.',
      data: { conversation: updatedConv },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieve permitted contacts for starting new conversations
 */
export const getContacts = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = user.id;
    let query = { _id: { $ne: userId }, status: USER_STATUSES.ACTIVE };

    // Fetch staff (administrators & coordinators)
    const staff = await User.find({
      role: { $in: [ROLES.ADMIN, ROLES.COORDINATOR] },
      status: USER_STATUSES.ACTIVE,
    }).select('_id');
    const staffIds = staff.map((s) => s._id.toString());

    // Fetch all active companies and mentors so users can message all company members
    const companyAndMentors = await User.find({
      role: { $in: [ROLES.COMPANY, ROLES.MENTOR] },
      status: USER_STATUSES.ACTIVE,
    }).select('_id');
    const companyAndMentorIds = companyAndMentors.map((c) => c._id.toString());

    let allowedUserIds = new Set([...staffIds, ...companyAndMentorIds]);

    if (user.role === ROLES.STUDENT) {
      // Students can message all company members, mentors, staff, plus any allocated peers
      const [allocations, applications] = await Promise.all([
        Allocation.find({ student: userId, status: 'active' }).select('company mentor'),
        Application.find({ student: userId }).select('company'),
      ]);

      allocations.forEach((a) => {
        if (a.company) allowedUserIds.add(a.company.toString());
        if (a.mentor) allowedUserIds.add(a.mentor.toString());
      });
      applications.forEach((a) => {
        if (a.company) allowedUserIds.add(a.company.toString());
      });

      query._id = { $in: Array.from(allowedUserIds) };
    } else if (user.role === ROLES.COMPANY) {
      // Companies can message all staff, mentors, and all students
      const allStudents = await User.find({ role: ROLES.STUDENT, status: USER_STATUSES.ACTIVE }).select('_id');
      allStudents.forEach((s) => allowedUserIds.add(s._id.toString()));

      query._id = { $in: Array.from(allowedUserIds) };
    } else if (user.role === ROLES.MENTOR) {
      // Mentors can message all staff, company members, other mentors, and students
      const allStudents = await User.find({ role: ROLES.STUDENT, status: USER_STATUSES.ACTIVE }).select('_id');
      allStudents.forEach((s) => allowedUserIds.add(s._id.toString()));

      query._id = { $in: Array.from(allowedUserIds) };
    } else {
      // Admins and coordinators can message anyone in the system
      query = { _id: { $ne: userId }, status: USER_STATUSES.ACTIVE };
    }

    const contacts = await User.find(query)
      .select('name email role status profile createdAt')
      .sort({ role: 1, name: 1 })
      .lean();

    const onlineSet = new Set(getOnlineUserIds());
    const enrichedContacts = contacts.map((c) => ({
      ...c,
      isOnline: onlineSet.has(c._id.toString()),
    }));

    res.status(200).json({
      success: true,
      data: {
        contacts: enrichedContacts,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get online status of users
 */
export const getOnlineUsers = (req, res) => {
  const onlineUserIds = getOnlineUserIds();
  res.status(200).json({
    success: true,
    data: {
      onlineUserIds,
    },
  });
};

/**
 * Toggle an emoji reaction on a message (add if not present, remove if already reacted)
 */
export const toggleMessageReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Emoji string is required.',
      });
    }

    const message = await Message.findById(messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    // Verify user is a member of this conversation
    const conversation = await Conversation.findOne({
      _id: message.conversation,
      participants: userId,
    });
    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a member of this conversation.',
      });
    }

    if (!Array.isArray(message.reactions)) {
      message.reactions = [];
    }

    const trimmedEmoji = emoji.trim();
    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId.toString() && r.emoji === trimmedEmoji
    );

    if (existingIndex > -1) {
      // User already reacted with this emoji: remove (toggle off)
      message.reactions.splice(existingIndex, 1);
    } else {
      // Add new reaction
      message.reactions.push({
        emoji: trimmedEmoji,
        user: userId,
        createdAt: new Date(),
      });
    }

    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email role profile')
      .populate('reactions.user', 'name role profile')
      .lean();

    // Broadcast reaction live via Socket.IO to room & user rooms
    emitMessageReaction(
      message.conversation,
      {
        conversationId: message.conversation.toString(),
        messageId: message._id.toString(),
        reactions: populated.reactions || [],
        userId: userId.toString(),
        emoji: trimmedEmoji,
      },
      conversation.participants
    );

    res.status(200).json({
      success: true,
      message: 'Reaction updated successfully.',
      data: {
        messageId: message._id.toString(),
        reactions: populated.reactions || [],
      },
    });
  } catch (err) {
    next(err);
  }
};
