import mongoose from 'mongoose';
import { verifyPassword } from '../utils/security.js';

export const ROLES = {
  ADMIN: 'admin',
  COORDINATOR: 'coordinator',
  COMPANY: 'company',
  MENTOR: 'mentor',
  STUDENT: 'student',
};

// Roles that can be registered by the public self-registration flow
export const ALLOWED_SELF_REGISTRATION_ROLES = [ROLES.STUDENT, ROLES.COMPANY, ROLES.MENTOR];

export const USER_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
};

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Hidden by default from queries
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    role: {
      type: String,
      required: [true, 'User role is required'],
      enum: {
        values: Object.values(ROLES),
        message: 'Role {VALUE} is not valid',
      },
      default: ROLES.STUDENT,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(USER_STATUSES),
        message: 'Status {VALUE} is not valid',
      },
      default: USER_STATUSES.ACTIVE,
      index: true,
    },
    profile: {
      phone: { type: String, trim: true },
      bio: { type: String, trim: true, maxlength: [500, 'Bio must not exceed 500 characters'] },
      avatarUrl: { type: String, trim: true },
      department: { type: String, trim: true },

      // Student/Intern specialized profile
      studentDetails: {
        studentId: { type: String, trim: true },
        department: { type: String, trim: true },
        course: { type: String, trim: true },
        graduationYear: { type: Number, min: 2000, max: 2100 },
        cgpa: { type: Number, min: 0, max: 10 },
        skills: [{ type: String, trim: true }],
        resumeUrl: { type: String, trim: true },
        resumeFileName: { type: String, trim: true },
        resumeUploadedAt: { type: Date },
        linkedinUrl: { type: String, trim: true },
        githubUrl: { type: String, trim: true },
        portfolioUrl: { type: String, trim: true },
      },

      // Company/Employer specialized profile
      companyDetails: {
        companyName: { type: String, trim: true },
        industry: { type: String, trim: true },
        website: { type: String, trim: true },
        description: { type: String, trim: true },
        address: { type: String, trim: true },
        contactEmail: { type: String, trim: true },
        contactPhone: { type: String, trim: true },
        isVerified: { type: Boolean, default: false },
      },

      // Mentor specialized profile
      mentorDetails: {
        companyName: { type: String, trim: true },
        designation: { type: String, trim: true },
        expertise: [{ type: String, trim: true }],
        yearsOfExperience: { type: Number, min: 0, max: 60 },
        linkedinUrl: { type: String, trim: true },
      },

      // Internship Coordinator specialized profile
      coordinatorDetails: {
        institution: { type: String, trim: true },
        facultyId: { type: String, trim: true },
        department: { type: String, trim: true },
        designation: { type: String, trim: true },
        officeLocation: { type: String, trim: true },
      },
    },

    googleId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for user management query optimization
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'profile.studentDetails.studentId': 1 }, { sparse: true });

/**
 * Validates candidate plaintext password against stored scrypt hash.
 */
userSchema.methods.isValidPassword = async function (password) {
  return verifyPassword(password, this.passwordHash);
};

/**
 * Safety check: Verifies if modifying or deactivating targetUserId
 * leaves at least one active administrator in the system.
 */
userSchema.statics.canDemoteOrDeactivate = async function (targetUserId) {
  const otherActiveAdminsCount = await this.countDocuments({
    _id: { $ne: targetUserId },
    role: ROLES.ADMIN,
    status: USER_STATUSES.ACTIVE,
  });

  return otherActiveAdminsCount > 0;
};

export const User = mongoose.model('User', userSchema);
export default User;
