import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { Conversation, CONVERSATION_TYPES } from '../models/Conversation.js';
import { Message, ATTACHMENT_TYPES } from '../models/Message.js';
import { User, ROLES, USER_STATUSES } from '../models/User.js';
import { Allocation } from '../models/Allocation.js';
import { Application } from '../models/Application.js';
import {
  emitChatMessage,
  emitMessageEdited,
  emitMessageDeleted,
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
import { CHAT_UPLOAD_DIR, getAttachmentType } from '../utils/chatFileUpload.js';
import { logger } from '../utils/logger.js';

/**
 * List all conversations for the authenticated user with unread counts & partner presence
 */
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name email role profile lastSeen')
      .populate('creator', 'name email role')
      .populate('groupAdmins', 'name email role')
      .populate({
        path: 'lastMessage',
        select: 'content sender createdAt isDeleted attachments',
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
          deletedFor: { $ne: userId },
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
        .populate('participants', 'name email role profile lastSeen')
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
      .populate('participants', 'name email role profile lastSeen')
      .populate({
        path: 'lastMessage',
        select: 'content sender createdAt isDeleted attachments',
        populate: { path: 'sender', select: 'name email role' },
      });

    if (directConv) {
      return res.status(200).json({
        success: true,
        message: 'Existing direct conversation retrieved.',
        data: { conversation: directConv },
      });
    }

    // Create fresh direct conversation
    const newDirectConv = await Conversation.create({
      type: CONVERSATION_TYPES.DIRECT,
      participants: [userId, recipientId],
      readReceipts: [
        { user: userId, lastReadAt: new Date() },
        { user: recipientId, lastReadAt: new Date(0) },
      ],
      lastMessageAt: new Date(),
    });

    directConv = await Conversation.findById(newDirectConv._id)
      .populate('participants', 'name email role profile lastSeen');

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
      deletedFor: { $ne: userId },
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
 * Get paginated messages for a conversation with populated replies & sender info
 */
export const getMessages = async (req, res, next) => {
  try {
    const conversationId = req.conversation._id;
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 40));
    const skip = (page - 1) * limit;

    // Exclude messages deleted specifically for current user
    const query = {
      conversation: conversationId,
      deletedFor: { $ne: userId },
    };

    const [messagesDesc, total] = await Promise.all([
      Message.find(query)
        .populate('sender', 'name email role profile')
        .populate('reactions.user', 'name role profile')
        .populate({
          path: 'replyTo',
          select: 'content sender attachments isDeleted',
          populate: { path: 'sender', select: 'name email role' },
        })
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
 * Send a new message (text, files, and/or quoted reply) in conversation
 */
export const sendMessage = async (req, res, next) => {
  try {
    const conversation = req.conversation;
    const userId = req.user.id;
    const content = req.sanitizedContent || '';
    const replyToId = req.replyToMessageId;
    const clientMsgId = req.clientMsgId;

    // Idempotency check: prevent duplicate message delivery on client network retry
    if (clientMsgId) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existingMsg = await Message.findOne({
        conversation: conversation._id,
        sender: userId,
        clientMsgId,
        createdAt: { $gte: fiveMinutesAgo },
      })
        .populate('sender', 'name email role profile')
        .populate('reactions.user', 'name role profile')
        .populate({
          path: 'replyTo',
          select: 'content sender attachments isDeleted',
          populate: { path: 'sender', select: 'name email role' },
        })
        .lean();

      if (existingMsg) {
        return res.status(200).json({
          success: true,
          message: 'Message already sent (idempotent response).',
          data: { message: existingMsg },
        });
      }
    }

    // Process attached files if uploaded via multipart/form-data
    const attachments = [];
    const filesToProcess = [];

    if (req.file) {
      filesToProcess.push(req.file);
    }
    if (req.files) {
      if (Array.isArray(req.files)) {
        filesToProcess.push(...req.files);
      } else if (typeof req.files === 'object') {
        const allFiles = Object.values(req.files).flat().filter(Boolean);
        filesToProcess.push(...allFiles);
      }
    }

    for (const f of filesToProcess) {
      const ext = path.extname(f.originalname).toLowerCase();
      const fileType = getAttachmentType(ext, f.mimetype);
      attachments.push({
        url: `/api/chat/attachments/${f.filename}`,
        fileName: f.originalname,
        fileType,
        mimeType: f.mimetype,
        size: f.size,
        fileKey: f.filename,
      });
    }

    // Also support pre-uploaded attachment objects passed via JSON body
    if (Array.isArray(req.body.attachments)) {
      for (const att of req.body.attachments) {
        if (att && att.fileKey && att.fileName) {
          attachments.push({
            url: att.url || `/api/chat/attachments/${att.fileKey}`,
            fileName: att.fileName,
            fileType: att.fileType || 'other',
            mimeType: att.mimeType || 'application/octet-stream',
            size: Number(att.size) || 0,
            fileKey: att.fileKey,
          });
        }
      }
    }

    const newMessage = await Message.create({
      conversation: conversation._id,
      sender: userId,
      content,
      attachments,
      replyTo: replyToId || null,
      clientMsgId: clientMsgId || null,
      status: 'sent',
      readBy: [userId],
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name email role profile')
      .populate('reactions.user', 'name role profile')
      .populate({
        path: 'replyTo',
        select: 'content sender attachments isDeleted',
        populate: { path: 'sender', select: 'name email role' },
      })
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

    // Notification summary text
    let notifSnippet = content;
    if (!notifSnippet && attachments.length > 0) {
      notifSnippet = `Sent an attachment: ${attachments[0].fileName}`;
    }

    // Dispatch real-time in-app notification to all other participants
    for (const participantId of conversation.participants) {
      const pIdStr = (participantId._id || participantId).toString();
      if (pIdStr !== userId.toString()) {
        createAndDispatchNotification({
          recipientId: pIdStr,
          senderId: userId,
          type: NOTIFICATION_TYPES.NEW_MESSAGE,
          title: `New message from ${req.user.name}`,
          message: notifSnippet.length > 80 ? `${notifSnippet.substring(0, 77)}...` : notifSnippet,
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
 * Upload single attachment file directly and return metadata
 */
export const uploadAttachment = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded or invalid file format.',
    });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const fileType = getAttachmentType(ext, req.file.mimetype);

  const attachment = {
    url: `/api/chat/attachments/${req.file.filename}`,
    fileName: req.file.originalname,
    fileType,
    mimeType: req.file.mimetype,
    size: req.file.size,
    fileKey: req.file.filename,
  };

  res.status(200).json({
    success: true,
    message: 'File uploaded successfully.',
    data: { attachment },
  });
};

/**
 * Securely stream and download chat attachment with membership authorization check
 */
export const downloadAttachment = async (req, res, next) => {
  try {
    const { fileKey } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!fileKey || typeof fileKey !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid file key.',
      });
    }

    // Sanitize filename to prevent directory traversal
    const safeKey = path.basename(fileKey);
    const filePath = path.join(CHAT_UPLOAD_DIR, safeKey);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Attachment file not found on server.',
      });
    }

    // Locate the message containing this attachment to verify user membership
    const message = await Message.findOne({
      'attachments.fileKey': safeKey,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Attachment record not found.',
      });
    }

    // Check conversation membership
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    const isMember = conversation.participants.some(
      (p) => (p._id || p).toString() === userId.toString()
    );
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

    if (!isMember && !isPrivileged) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to download files from this conversation.',
      });
    }

    const targetAttachment = message.attachments.find((a) => a.fileKey === safeKey);
    const originalName = targetAttachment?.fileName || safeKey;
    const mimeType = targetAttachment?.mimeType || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

/**
 * Edit an existing message
 */
export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const content = req.sanitizedContent;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID.',
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a deleted message.',
      });
    }

    // Only the author can edit their own message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit your own messages.',
      });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'name email role profile')
      .populate('reactions.user', 'name role profile')
      .populate({
        path: 'replyTo',
        select: 'content sender attachments isDeleted',
        populate: { path: 'sender', select: 'name email role' },
      })
      .lean();

    const conversation = await Conversation.findById(message.conversation);
    if (conversation) {
      emitMessageEdited(conversation._id, populated, conversation.participants);
    }

    res.status(200).json({
      success: true,
      message: 'Message edited successfully.',
      data: { message: populated },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a message (supports "Delete for me" and "Delete for everyone")
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const mode = req.deleteMode || 'everyone';

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID.',
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    if (mode === 'everyone') {
      const isSender = message.sender.toString() === userId.toString();
      const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.COORDINATOR;

      if (!isSender && !isPrivileged) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Only the sender or an administrator can delete this message for everyone.',
        });
      }

      // Mark message as deleted for everyone and clear attachments
      message.isDeleted = true;
      message.content = 'This message was deleted';
      message.attachments = [];
      await message.save();

      emitMessageDeleted(
        conversation._id,
        {
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
          isDeletedForEveryone: true,
        },
        conversation.participants
      );

      return res.status(200).json({
        success: true,
        message: 'Message deleted for everyone.',
        data: { messageId: message._id.toString(), mode: 'everyone' },
      });
    }

    // Delete for me only
    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: userId },
    });

    emitMessageDeleted(
      conversation._id,
      {
        conversationId: conversation._id.toString(),
        messageId: message._id.toString(),
        isDeletedForEveryone: false,
        deletedForUserId: userId.toString(),
      },
      conversation.participants
    );

    return res.status(200).json({
      success: true,
      message: 'Message deleted for you.',
      data: { messageId: message._id.toString(), mode: 'me' },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Forward an existing message to one or multiple conversations
 */
export const forwardMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const rawTargetIds = req.body.targetConversationIds || [req.body.targetConversationId];
    const targetConversationIds = Array.isArray(rawTargetIds)
      ? rawTargetIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];

    if (targetConversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid target conversation ID is required.',
      });
    }

    const sourceMessage = await Message.findById(messageId);
    if (!sourceMessage || sourceMessage.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Source message not found or has been deleted.',
      });
    }

    const forwardedMessages = [];
    const now = new Date();

    for (const targetId of targetConversationIds) {
      const conv = await Conversation.findOne({
        _id: targetId,
        participants: userId,
      });

      if (!conv) continue;

      const newMsg = await Message.create({
        conversation: conv._id,
        sender: userId,
        content: sourceMessage.content,
        attachments: sourceMessage.attachments,
        readBy: [userId],
        status: 'sent',
      });

      const populated = await Message.findById(newMsg._id)
        .populate('sender', 'name email role profile')
        .populate('reactions.user', 'name role profile')
        .lean();

      await Conversation.findByIdAndUpdate(conv._id, {
        $set: {
          lastMessage: newMsg._id,
          lastMessageAt: now,
        },
      });

      emitChatMessage(conv._id, populated, conv.participants);
      forwardedMessages.push(populated);
    }

    res.status(201).json({
      success: true,
      message: `Message forwarded to ${forwardedMessages.length} conversation(s).`,
      data: { forwardedMessages },
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
    const { getIO } = await import('../socket.js');
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

    // Delete in-app message notifications for this conversation
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
      .populate('participants', 'name email role profile lastSeen')
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

    // Fetch all active companies and mentors
    const companyAndMentors = await User.find({
      role: { $in: [ROLES.COMPANY, ROLES.MENTOR] },
      status: USER_STATUSES.ACTIVE,
    }).select('_id');
    const companyAndMentorIds = companyAndMentors.map((c) => c._id.toString());

    let allowedUserIds = new Set([...staffIds, ...companyAndMentorIds]);

    if (user.role === ROLES.STUDENT) {
      // Students can message company members, mentors, staff, plus allocated peers
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
      const allStudents = await User.find({ role: ROLES.STUDENT, status: USER_STATUSES.ACTIVE }).select('_id');
      allStudents.forEach((s) => allowedUserIds.add(s._id.toString()));

      query._id = { $in: Array.from(allowedUserIds) };
    } else if (user.role === ROLES.MENTOR) {
      const allStudents = await User.find({ role: ROLES.STUDENT, status: USER_STATUSES.ACTIVE }).select('_id');
      allStudents.forEach((s) => allowedUserIds.add(s._id.toString()));

      query._id = { $in: Array.from(allowedUserIds) };
    } else {
      query = { _id: { $ne: userId }, status: USER_STATUSES.ACTIVE };
    }

    const contacts = await User.find(query)
      .select('name email role status profile lastSeen createdAt')
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
 * Toggle an emoji reaction on a message
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
      message.reactions.splice(existingIndex, 1);
    } else {
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
