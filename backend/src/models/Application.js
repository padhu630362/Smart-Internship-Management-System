import mongoose from 'mongoose';

export const APPLICATION_STATUSES = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  SHORTLISTED: 'shortlisted',
  INTERVIEW: 'interview',
  SELECTED: 'selected',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
};

// Permitted status transitions map for company/coordinator reviewers
export const VALID_TRANSITIONS = {
  [APPLICATION_STATUSES.SUBMITTED]: [
    APPLICATION_STATUSES.UNDER_REVIEW,
    APPLICATION_STATUSES.REJECTED,
    APPLICATION_STATUSES.WITHDRAWN,
  ],
  [APPLICATION_STATUSES.UNDER_REVIEW]: [
    APPLICATION_STATUSES.SHORTLISTED,
    APPLICATION_STATUSES.INTERVIEW,
    APPLICATION_STATUSES.REJECTED,
    APPLICATION_STATUSES.WITHDRAWN,
  ],
  [APPLICATION_STATUSES.SHORTLISTED]: [
    APPLICATION_STATUSES.INTERVIEW,
    APPLICATION_STATUSES.SELECTED,
    APPLICATION_STATUSES.REJECTED,
    APPLICATION_STATUSES.WITHDRAWN,
  ],
  [APPLICATION_STATUSES.INTERVIEW]: [
    APPLICATION_STATUSES.SELECTED,
    APPLICATION_STATUSES.SHORTLISTED,
    APPLICATION_STATUSES.REJECTED,
    APPLICATION_STATUSES.WITHDRAWN,
  ],
  [APPLICATION_STATUSES.SELECTED]: [
    APPLICATION_STATUSES.REJECTED,
    APPLICATION_STATUSES.WITHDRAWN,
  ],
  [APPLICATION_STATUSES.REJECTED]: [
    APPLICATION_STATUSES.UNDER_REVIEW, // Allow reconsidering
  ],
  [APPLICATION_STATUSES.WITHDRAWN]: [], // Terminal state for student
};

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: Object.values(APPLICATION_STATUSES),
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedByName: {
      type: String,
      trim: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const applicationSchema = new mongoose.Schema(
  {
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: [true, 'Internship opportunity ID is required'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Applying student ID is required'],
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target company ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(APPLICATION_STATUSES),
        message: 'Application status {VALUE} is not valid',
      },
      default: APPLICATION_STATUSES.SUBMITTED,
      index: true,
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [3000, 'Cover letter must not exceed 3000 characters'],
    },
    resumeUrl: {
      type: String,
      required: [true, 'Verified resume document reference is required'],
      trim: true,
    },
    resumeFileName: {
      type: String,
      trim: true,
    },
    studentSnapshot: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      studentId: { type: String, trim: true },
      department: { type: String, trim: true },
      course: { type: String, trim: true },
      graduationYear: { type: Number },
      cgpa: { type: Number },
      skills: [{ type: String, trim: true }],
      linkedinUrl: { type: String, trim: true },
      githubUrl: { type: String, trim: true },
      portfolioUrl: { type: String, trim: true },
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review notes must not exceed 1000 characters'],
    },
    decisionReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Decision reason must not exceed 1000 characters'],
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    interviewDetails: {
      scheduledAt: { type: Date },
      meetingLink: { type: String, trim: true },
      location: { type: String, trim: true },
      instructions: { type: String, trim: true },
    },
    statusHistory: [statusHistorySchema],
    aiAnalysis: {
      matchScore: { type: Number, min: 0, max: 100, default: null },
      matchedSkills: [{ type: String, trim: true }],
      missingSkills: [{ type: String, trim: true }],
      extractedSkills: [{ type: String, trim: true }],
      educationSummary: { type: String, trim: true },
      experienceSummary: { type: String, trim: true },
      strengths: [{ type: String, trim: true }],
      improvements: [{ type: String, trim: true }],
      overallAssessment: { type: String, trim: true },
      isGeminiGenerated: { type: Boolean, default: false },
      engine: { type: String, default: 'Deterministic Semantic Matcher' },
      analyzedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Strict unique compound index: Prevents duplicate applications to the same internship
applicationSchema.index({ internship: 1, student: 1 }, { unique: true });

// Compound indexes for fast filtering and query isolation
applicationSchema.index({ company: 1, status: 1, createdAt: -1 });
applicationSchema.index({ student: 1, createdAt: -1 });
applicationSchema.index({ internship: 1, status: 1 });

export const Application = mongoose.model('Application', applicationSchema);
export default Application;
