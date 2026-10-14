import mongoose from 'mongoose';

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  COMPLETED: 'completed',
  REVISION_REQUESTED: 'revision_requested',
};

const taskHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedByName: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      default: '',
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required.'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters.'],
    },
    description: {
      type: String,
      required: [true, 'Task description is required.'],
      trim: true,
    },
    allocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Allocation',
      required: [true, 'Allocation reference is required.'],
      index: true,
    },
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task assignee (student) is required.'],
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Task due date is required.'],
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITIES),
      default: TASK_PRIORITIES.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUSES),
      default: TASK_STATUSES.TODO,
      index: true,
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    submissionNotes: {
      type: String,
      trim: true,
      default: '',
    },
    submissionLink: {
      type: String,
      trim: true,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewerFeedback: {
      type: String,
      trim: true,
      default: '',
    },
    history: [taskHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Virtual for overdue flag
taskSchema.virtual('isOverdue').get(function () {
  if (this.status === TASK_STATUSES.COMPLETED) return false;
  return new Date() > new Date(this.dueDate);
});

taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ allocation: 1, status: 1 });
taskSchema.index({ assignedBy: 1, dueDate: 1 });

export const Task = mongoose.model('Task', taskSchema);
export default Task;
