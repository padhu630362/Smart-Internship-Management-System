import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = {
  OPPORTUNITY_PUBLISHED: 'opportunity_published',
  APPLICATION_SUBMITTED: 'application_submitted',
  APPLICATION_STATUS: 'application_status',
  INTERN_ALLOCATED: 'intern_allocated',
  TASK_ASSIGNED: 'task_assigned',
  TASK_FEEDBACK: 'task_feedback',
  TASK_DEADLINE: 'task_deadline',
  ATTENDANCE_REVIEWED: 'attendance_reviewed',
  MENTOR_ANNOUNCEMENT: 'mentor_announcement',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  CERTIFICATE_ISSUED: 'certificate_issued',
  JOB_ALERT: 'job_alert',
};

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required.'],
      trim: true,
      maxlength: [150, 'Notification title cannot exceed 150 characters.'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required.'],
      trim: true,
      maxlength: [1000, 'Notification message cannot exceed 1000 characters.'],
    },
    link: {
      type: String,
      trim: true,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for API compatibility
notificationSchema.virtual('recipientId').get(function () {
  return this.recipient;
});

notificationSchema.virtual('senderId').get(function () {
  return this.sender;
});

// Compound indexes for performant notification lookups & sorting
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

// TTL index: self-pruning after 90 days (7,776,000 seconds)
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 }
);

export const Notification = mongoose.model('Notification', notificationSchema);
