import crypto from 'node:crypto';
import { Session } from '../models/Session.js';
import { signToken } from './jwt.js';

/**
 * Hash a JWT token using SHA-256 for safe database indexing without exposing raw tokens.
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
};

/**
 * Parse client User-Agent string to detect browser, operating system, and device type.
 */
export const parseUserAgent = (uaString = '') => {
  const ua = String(uaString).toLowerCase();

  // Detect Device Type
  let deviceType = 'Desktop';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) {
    deviceType = 'Tablet';
  }

  // Detect Browser
  let browser = 'Web Browser';
  if (/edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/opr|opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/curl|postman|insomnia/i.test(ua)) {
    browser = 'API Client';
  }

  // Detect Operating System
  let os = 'Operating System';
  if (/windows nt 10/i.test(ua)) {
    os = 'Windows 10/11';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  return { deviceType, browser, os };
};

/**
 * Extract client IP address from Express request.
 */
export const extractClientIp = (req) => {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
};

/**
 * Issue a signed JWT token and create a tracking Session record atomically.
 */
export const issueUserSession = async ({ user, req, expiresIn }) => {
  const sessionId = crypto.randomUUID();
  const token = signToken(
    {
      id: user._id ? user._id.toString() : user.id.toString(),
      role: user.role,
      email: user.email,
      sessionId,
    },
    expiresIn
  );

  const tokenHash = hashToken(token);
  const uaString = req?.headers?.['user-agent'] || 'Browser Client';
  const { deviceType, browser, os } = parseUserAgent(uaString);
  const ip = extractClientIp(req);
  const ttlSeconds = 7 * 86400; // 7 days default
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const session = await Session.create({
    user: user._id || user.id,
    sessionId,
    tokenHash,
    ip,
    userAgent: uaString.substring(0, 250),
    deviceType,
    browser,
    os,
    lastActiveAt: new Date(),
    expiresAt,
    isRevoked: false,
  });

  return { token, session, sessionId };
};

/**
 * Create a new managed active session in MongoDB.
 */
export const createSessionRecord = async ({ user, token, req, ttlSeconds = 7 * 86400 }) => {
  const sessionId = crypto.randomUUID();
  const tokenHash = hashToken(token);
  const uaString = req?.headers?.['user-agent'] || 'Browser Client';
  const { deviceType, browser, os } = parseUserAgent(uaString);
  const ip = extractClientIp(req);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const session = await Session.create({
    user: user._id || user.id,
    sessionId,
    tokenHash,
    ip,
    userAgent: uaString.substring(0, 250),
    deviceType,
    browser,
    os,
    lastActiveAt: new Date(),
    expiresAt,
    isRevoked: false,
  });

  return session;
};

/**
 * Invalidate a session by its unique sessionId.
 */
export const revokeSession = async (sessionId, userId) => {
  if (!sessionId) return null;
  const filter = { sessionId };
  if (userId) filter.user = userId;

  return Session.findOneAndUpdate(
    filter,
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    },
    { new: true }
  );
};

/**
 * Invalidate all other active sessions for a user except the current one.
 */
export const revokeAllOtherSessions = async (currentSessionId, userId) => {
  if (!userId) return 0;
  const result = await Session.updateMany(
    {
      user: userId,
      sessionId: { $ne: currentSessionId },
      isRevoked: false,
    },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    }
  );
  return result.modifiedCount || 0;
};

/**
 * Retrieve all active, non-revoked sessions for a user with the isCurrent flag.
 */
export const listActiveSessions = async (userId, currentSessionId) => {
  if (!userId) return [];

  const sessions = await Session.find({
    user: userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastActiveAt: -1 })
    .lean();

  return sessions.map((s) => ({
    id: s.sessionId,
    sessionId: s.sessionId,
    deviceType: s.deviceType,
    browser: s.browser,
    os: s.os,
    ip: s.ip,
    lastActiveAt: s.lastActiveAt,
    createdAt: s.createdAt,
    isCurrent: s.sessionId === currentSessionId,
  }));
};
