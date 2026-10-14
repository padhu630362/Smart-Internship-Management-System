import mongoose from 'mongoose';

export const ATTENDANCE_STATUSES = {
  PRESENT: 'present',
  ABSENT: 'absent',
  HALF_DAY: 'half_day',
  REMOTE: 'remote',
  EXCUSED: 'excused',
};

export const ATTENDANCE_REVIEW_STATUSES = {
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CORRECTED: 'corrected',
};

const correctionHistorySchema = new mongoose.Schema(
  {
    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    correctedByName: {
      type: String,
      default: '',
    },
    correctedAt: {
      type: Date,
      default: Date.now,
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required.'],
      index: true,
    },
    allocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Allocation',
      required: [true, 'Allocation reference is required.'],
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required.'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUSES),
      default: ATTENDANCE_STATUSES.PRESENT,
      index: true,
    },
    checkInTime: {
      type: String,
      trim: true,
      default: '',
    },
    checkOutTime: {
      type: String,
      trim: true,
      default: '',
    },
    workSummary: {
      type: String,
      trim: true,
      default: '',
    },
    reviewStatus: {
      type: String,
      enum: Object.values(ATTENDANCE_REVIEW_STATUSES),
      default: ATTENDANCE_REVIEW_STATUSES.SUBMITTED,
      index: true,
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
    reviewNotes: {
      type: String,
      trim: true,
      default: '',
    },
    correctionHistory: [correctionHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance entries for the same student and date
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ allocation: 1, date: -1 });
attendanceSchema.index({ company: 1, date: -1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
