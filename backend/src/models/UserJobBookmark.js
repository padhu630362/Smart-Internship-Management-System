import mongoose from 'mongoose';

const userJobBookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    externalJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExternalJob',
      required: true,
      index: true,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
      index: true,
    },
    isApplied: {
      type: Boolean,
      default: false,
      index: true,
    },
    appliedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters.'],
      default: '',
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    matchRationale: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    matchCalculatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee one tracking document per user per external job
userJobBookmarkSchema.index({ user: 1, externalJob: 1 }, { unique: true });
userJobBookmarkSchema.index({ user: 1, isBookmarked: 1 });
userJobBookmarkSchema.index({ user: 1, isApplied: 1 });

export const UserJobBookmark = mongoose.model('UserJobBookmark', userJobBookmarkSchema);
export default UserJobBookmark;

