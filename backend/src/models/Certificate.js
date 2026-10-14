import mongoose from 'mongoose';

export const CERTIFICATE_STATUSES = {
  ISSUED: 'issued',
  REVOKED: 'revoked',
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
    },
    endDate: {
      type: Date,
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
  },
  {
    timestamps: true,
  }
);

certificateSchema.index({ student: 1, internship: 1 });

export const Certificate = mongoose.model('Certificate', certificateSchema);
export default Certificate;

