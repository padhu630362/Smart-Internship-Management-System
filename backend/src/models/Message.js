import mongoose from 'mongoose';

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
      required: [true, 'Message content cannot be empty.'],
      trim: true,
      minlength: [1, 'Message must be at least 1 character long.'],
      maxlength: [2000, 'Message cannot exceed 2000 characters.'],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Performance compound index for fast chat history retrieval
messageSchema.index({ conversation: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
