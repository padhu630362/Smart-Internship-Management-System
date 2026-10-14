import mongoose from 'mongoose';

export const JOB_SOURCES = {
  ARBEITNOW: 'arbeitnow',
  REMOTEOK: 'remoteok',
  JSEARCH: 'jsearch',
  PARTNER: 'partner',
  DIRECT: 'direct',
};

export const JOB_TYPES = {
  INTERNSHIP: 'internship',
  ENTRY_LEVEL: 'entry-level',
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  OTHER: 'other',
};

const externalJobSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: [true, 'External job identifier is required.'],
      unique: true,
      trim: true,
      index: true,
    },
    canonicalUrl: {
      type: String,
      required: [true, 'Canonical listing URL is required.'],
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required.'],
      trim: true,
      maxlength: [200, 'Job title cannot exceed 200 characters.'],
      index: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required.'],
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters.'],
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: 'Remote / Flexible',
    },
    isRemote: {
      type: Boolean,
      default: false,
      index: true,
    },
    jobType: {
      type: String,
      enum: Object.values(JOB_TYPES),
      default: JOB_TYPES.INTERNSHIP,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required.'],
    },
    snippet: {
      type: String,
      trim: true,
      maxlength: [500, 'Snippet cannot exceed 500 characters.'],
      default: '',
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    salary: {
      type: String,
      trim: true,
      default: null,
    },
    source: {
      type: String,
      required: [true, 'Job provider source is required.'],
      trim: true,
      index: true,
    },
    sourceUrl: {
      type: String,
      required: [true, 'Source URL is required.'],
      trim: true,
    },
    linkedInSearchUrl: {
      type: String,
      trim: true,
      default: '',
    },
    companyLogo: {
      type: String,
      trim: true,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

// Pre-save hook: ensure compliant official LinkedIn search URL is always generated
externalJobSchema.pre('save', function (next) {
  if (!this.linkedInSearchUrl || this.isModified('title') || this.isModified('company')) {
    const query = encodeURIComponent(`${this.title} ${this.company}`.trim());
    const loc = this.location && this.location !== 'Remote / Flexible' ? `&location=${encodeURIComponent(this.location)}` : '';
    this.linkedInSearchUrl = `https://www.linkedin.com/jobs/search/?keywords=${query}${loc}`;
  }
  next();
});

// Indexes for fast searching, filtering, and sorting
externalJobSchema.index({ isActive: 1, publishedAt: -1 });
externalJobSchema.index({ tags: 1 });
externalJobSchema.index({ isRemote: 1, jobType: 1 });
externalJobSchema.index({ title: 'text', company: 'text', description: 'text' });

export const ExternalJob = mongoose.model('ExternalJob', externalJobSchema);
export default ExternalJob;

