import mongoose from 'mongoose';

export const ALLOCATION_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  TERMINATED: 'terminated',
};

const allocationHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: Object.values(ALLOCATION_STATUSES),
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
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const allocationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required for allocation.'],
      index: true,
    },
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: [true, 'Internship opportunity is required.'],
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host company is required.'],
      index: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    startDate: {
      type: Date,
      required: [true, 'Internship start date is required.'],
    },
    endDate: {
      type: Date,
      required: [true, 'Internship end date is required.'],
    },
    status: {
      type: String,
      enum: Object.values(ALLOCATION_STATUSES),
      default: ALLOCATION_STATUSES.ACTIVE,
      index: true,
    },
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    statusHistory: [allocationHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Helpful compound indexes for queries
allocationSchema.index({ student: 1, status: 1 });
allocationSchema.index({ company: 1, status: 1 });
allocationSchema.index({ mentor: 1, status: 1 });
allocationSchema.index({ internship: 1, status: 1 });

export const Allocation = mongoose.model('Allocation', allocationSchema);
export default Allocation;
