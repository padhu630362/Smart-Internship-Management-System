import mongoose from 'mongoose';

export const AUDIT_ACTIONS = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  USER_DELETED: 'USER_DELETED',
  APPLICATION_DECISION: 'APPLICATION_DECISION',
  ATTENDANCE_CORRECTED: 'ATTENDANCE_CORRECTED',
  ALLOCATION_STATUS_CHANGED: 'ALLOCATION_STATUS_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  USER_REGISTER_GOOGLE: 'USER_REGISTER_GOOGLE',
  USER_LOGIN_GOOGLE: 'USER_LOGIN_GOOGLE',
  SECURITY_EVENT: 'SECURITY_EVENT',
};

export const RESOURCE_TYPES = {
  USER: 'User',
  APPLICATION: 'Application',
  ATTENDANCE: 'Attendance',
  ALLOCATION: 'Allocation',
  INTERNSHIP: 'Internship',
  AUTH: 'Auth',
  SYSTEM: 'System',
};

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Audit action is required.'],
      enum: Object.values(AUDIT_ACTIONS),
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    performedByRole: {
      type: String,
      default: 'system',
    },
    performedByEmail: {
      type: String,
      default: 'system',
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    targetResource: {
      type: String,
      required: false,
      index: true,
    },
    resourceType: {
      type: String,
      enum: Object.values(RESOURCE_TYPES),
      required: true,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: 'unknown',
    },
    userAgent: {
      type: String,
      default: 'unknown',
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

// Query optimization compound indexes
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ targetUser: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
