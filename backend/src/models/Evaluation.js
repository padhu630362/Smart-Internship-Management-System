import mongoose from 'mongoose';

export const EVALUATION_TYPES = {
  MID_TERM: 'mid_term',
  FINAL: 'final',
};

export const EVALUATION_RECOMMENDATIONS = {
  HIGHLY_RECOMMENDED: 'highly_recommended',
  RECOMMENDED: 'recommended',
  SATISFACTORY: 'satisfactory',
  NEEDS_IMPROVEMENT: 'needs_improvement',
  NOT_RECOMMENDED: 'not_recommended',
};

const evaluationSchema = new mongoose.Schema(
  {
    allocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Allocation',
      required: [true, 'Allocation reference is required.'],
      index: true,
    },
    internship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: [true, 'Internship reference is required.'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required.'],
      index: true,
    },
    evaluator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Evaluator reference is required.'],
      index: true,
    },
    evaluationType: {
      type: String,
      enum: Object.values(EVALUATION_TYPES),
      required: [true, 'Evaluation type (mid_term or final) is required.'],
    },
    ratings: {
      technicalSkills: {
        type: Number,
        required: [true, 'Technical skills rating is required (1-5).'],
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        required: [true, 'Communication rating is required (1-5).'],
        min: 1,
        max: 5,
      },
      punctualityAndAttendance: {
        type: Number,
        required: [true, 'Punctuality rating is required (1-5).'],
        min: 1,
        max: 5,
      },
      initiativeAndLearning: {
        type: Number,
        required: [true, 'Initiative and learning rating is required (1-5).'],
        min: 1,
        max: 5,
      },
      qualityOfWork: {
        type: Number,
        required: [true, 'Quality of work rating is required (1-5).'],
        min: 1,
        max: 5,
      },
      overallRating: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
    feedback: {
      strengths: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: '',
      },
      areasForImprovement: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: '',
      },
      generalComments: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: '',
      },
    },
    recommendation: {
      type: String,
      enum: Object.values(EVALUATION_RECOMMENDATIONS),
      default: EVALUATION_RECOMMENDATIONS.RECOMMENDED,
    },
    isPassed: {
      type: Boolean,
      default: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate overallRating average automatically before saving if not explicitly set
evaluationSchema.pre('save', function (next) {
  if (this.ratings) {
    const {
      technicalSkills,
      communication,
      punctualityAndAttendance,
      initiativeAndLearning,
      qualityOfWork,
    } = this.ratings;
    const avg =
      (technicalSkills +
        communication +
        punctualityAndAttendance +
        initiativeAndLearning +
        qualityOfWork) /
      5;
    this.ratings.overallRating = Math.round(avg * 10) / 10;
  }
  next();
});

// Enforce unique mid_term and final evaluation per allocation
evaluationSchema.index({ allocation: 1, evaluationType: 1 }, { unique: true });
evaluationSchema.index({ student: 1, evaluationType: 1 });
evaluationSchema.index({ evaluator: 1, createdAt: -1 });

export const Evaluation = mongoose.model('Evaluation', evaluationSchema);
export default Evaluation;
