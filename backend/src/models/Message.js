import mongoose from 'mongoose';

export const ATTACHMENT_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  PDF: 'pdf',
  DOCUMENT: 'document',
  SPREADSHEET: 'spreadsheet',
  PRESENTATION: 'presentation',
  OTHER: 'other',
};

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    fileName: { type: String, required: true, trim: true },
    fileType: {
      type: String,
      enum: Object.values(ATTACHMENT_TYPES),
      default: ATTACHMENT_TYPES.OTHER,
    },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    fileKey: { type: String, required: true },
  },
  { _id: true, timestamps: true }
);

const replySnapshotSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    senderName: {
      type: String,
      default: 'User',
      trim: true,
    },
    senderRole: {
      type: String,
      default: '',
      trim: true,
    },
    contentPreview: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    hasAttachments: {
      type: Boolean,
      default: false,
    },
    attachmentSummary: {
      type: String,
      default: '',
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required.'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required.'],
      index: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters.'],
      default: '',
    },
    attachments: [attachmentSchema],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    replyToMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
      index: true,
    },
    replySnapshot: {
      type: replySnapshotSchema,
      default: null,
    },
    clientMsgId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
          trim: true,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Performance compound index for fast chat history retrieval
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, deletedFor: 1 });
messageSchema.index({ conversation: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, 'attachments.fileType': 1, isDeleted: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
export default Message;
