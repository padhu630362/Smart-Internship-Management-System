import mongoose from 'mongoose';

export const WORK_MODES = {
  REMOTE: 'remote',
  HYBRID: 'hybrid',
  ONSITE: 'on-site',
};

export const INTERNSHIP_STATUSES = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
};

const internshipSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Internship title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [150, 'Title must not exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Internship description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters long'],
      maxlength: [5000, 'Description must not exceed 5000 characters'],
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owning company user ID is required'],
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    requiredSkills: [
      {
        type: String,
        trim: true,
      },
    ],
    eligibility: {
      minCgpa: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
      allowedDepartments: [
        {
          type: String,
          trim: true,
        },
      ],
      allowedGraduationYears: [
        {
          type: Number,
        },
      ],
      otherRequirements: {
        type: String,
        trim: true,
      },
    },
    location: {
      type: String,
      trim: true,
      default: 'Flexible / Multiple Locations',
    },
    workMode: {
      type: String,
      enum: {
        values: Object.values(WORK_MODES),
        message: 'Work mode {VALUE} is not valid',
      },
      default: WORK_MODES.ONSITE,
      index: true,
    },
    stipend: {
      hasStipend: {
        type: Boolean,
        default: true,
      },
      amount: {
        type: Number,
        min: 0,
        default: 0,
      },
      currency: {
        type: String,
        default: 'USD',
        uppercase: true,
        trim: true,
      },
      periodicity: {
        type: String,
        enum: ['monthly', 'weekly', 'lump-sum', 'hourly'],
        default: 'monthly',
      },
    },
    duration: {
      type: String,
      trim: true,
      default: '3 Months',
    },
    openings: {
      type: Number,
      required: [true, 'Number of openings is required'],
      min: [1, 'Number of openings must be at least 1'],
      default: 1,
    },
    startDate: {
      type: Date,
    },
    applicationStartDate: {
      type: Date,
      default: Date.now,
    },
    applicationDeadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(INTERNSHIP_STATUSES),
        message: 'Status {VALUE} is not valid',
      },
      default: INTERNSHIP_STATUSES.DRAFT,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    applicationsCount: {
      type: Number,
      default: 0,
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

// Compound indexes for search and filter performance
internshipSchema.index({ status: 1, workMode: 1, createdAt: -1 });
internshipSchema.index({ company: 1, status: 1 });
internshipSchema.index({ applicationDeadline: 1, status: 1 });

export const Internship = mongoose.model('Internship', internshipSchema);
export default Internship;
