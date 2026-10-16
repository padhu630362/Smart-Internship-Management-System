import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for a session.'],
      index: true,
    },
    sessionId: {
      type: String,
      required: [true, 'Unique session ID is required.'],
      unique: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required.'],
      index: true,
    },
    ip: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: 'Unknown Browser',
    },
    deviceType: {
      type: String,
      default: 'Desktop',
    },
    browser: {
      type: String,
      default: 'Web Browser',
    },
    os: {
      type: String,
      default: 'Operating System',
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Session expiry date is required.'],
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge expired sessions from MongoDB
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ user: 1, isRevoked: 1 });

export const Session = mongoose.model('Session', sessionSchema);
export default Session;

