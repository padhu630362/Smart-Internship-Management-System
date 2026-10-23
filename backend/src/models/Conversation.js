import mongoose from 'mongoose';

export const CONVERSATION_TYPES = {
  DIRECT: 'direct',
  GROUP: 'group',
};

const readReceiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const pinnedMessageSchema = new mongoose.Schema(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(CONVERSATION_TYPES),
      default: CONVERSATION_TYPES.DIRECT,
      required: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters.'],
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Group description cannot exceed 300 characters.'],
      default: null,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    groupAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    readReceipts: [readReceiptSchema],
    pinnedMessage: {
      type: pinnedMessageSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Performance compound indexes
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ type: 1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
