import mongoose from 'mongoose';

export const CERTIFICATE_STATUSES = {
  ISSUED: 'issued',
  REVOKED: 'revoked',
};

export const EMAIL_DELIVERY_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
};

const certificateSchema = new mongoose.Schema(
  {
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: [true, 'Internship reference is required'],
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Company reference is required'],
      index: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    allocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Allocation',
    },
    evaluation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evaluation',
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    studentEmail: {
      type: String,
      trim: true,
    },
    studentCollegeId: {
      type: String,
      trim: true,
    },
    internshipTitle: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    mentorName: {
      type: String,
      trim: true,
    },
    duration: {
      type: String,
      default: '3 Months',
    },
    startDate: {
      type: Date,
      required: [true, 'Actual verified internship start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Actual verified internship end date is required'],
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    finalRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4.5,
    },
    grade: {
      type: String,
      default: 'Distinction',
    },
    recommendation: {
      type: String,
      default: 'Recommended',
    },
    status: {
      type: String,
      enum: Object.values(CERTIFICATE_STATUSES),
      default: CERTIFICATE_STATUSES.ISSUED,
    },
    emailDeliveryStatus: {
      type: String,
      enum: Object.values(EMAIL_DELIVERY_STATUSES),
      default: EMAIL_DELIVERY_STATUSES.PENDING,
      index: true,
    },
    emailDeliveredAt: {
      type: Date,
      default: null,
    },
    emailError: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

certificateSchema.index({ student: 1, internship: 1 }, { unique: true });
certificateSchema.index({ allocation: 1 }, { unique: true, sparse: true });

export const Certificate = mongoose.model('Certificate', certificateSchema);
export default Certificate;

