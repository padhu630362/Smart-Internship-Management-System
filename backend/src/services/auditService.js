import { AuditLog, AUDIT_ACTIONS, RESOURCE_TYPES } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

/**
 * Persists an immutable audit log record to MongoDB.
 * Never throws an error to the caller to prevent operational failures.
 */
export const recordAuditLog = async ({
  action,
  req = null,
  performedBy = null,
  performedByRole = null,
  performedByEmail = null,
  targetUser = null,
  targetResource = null,
  resourceType = RESOURCE_TYPES.SYSTEM,
  details = {},
}) => {
  try {
    const actorId = performedBy || req?.user?._id || req?.user?.id || null;
    const actorRole = performedByRole || req?.user?.role || 'system';
    const actorEmail = performedByEmail || req?.user?.email || 'system';
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown';
    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    const logEntry = await AuditLog.create({
      action,
      performedBy: actorId,
      performedByRole: actorRole,
      performedByEmail: actorEmail,
      targetUser,
      targetResource: targetResource ? targetResource.toString() : undefined,
      resourceType,
      details,
      ipAddress: typeof ipAddress === 'string' ? ipAddress.slice(0, 45) : 'unknown',
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 255) : 'unknown',
    });

    return logEntry;
  } catch (err) {
    logger.warn(`Failed to record audit log: ${err.message}`);
    return null;
  }
};

export { AUDIT_ACTIONS, RESOURCE_TYPES };
export default { recordAuditLog, AUDIT_ACTIONS, RESOURCE_TYPES };
