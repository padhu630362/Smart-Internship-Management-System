import { AuditLog } from '../models/AuditLog.js';
import { escapeRegex } from '../middlewares/sanitize.js';

/**
 * Admin: List and filter immutable audit logs with safe pagination.
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.action && req.query.action !== 'all') {
      query.action = req.query.action;
    }

    if (req.query.resourceType && req.query.resourceType !== 'all') {
      query.resourceType = req.query.resourceType;
    }

    if (req.query.performedBy) {
      query.performedBy = req.query.performedBy;
    }

    if (req.query.targetUser) {
      query.targetUser = req.query.targetUser;
    }

    // Date range filtering
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Search by user email or action text
    if (req.query.search && req.query.search.trim()) {
      const safeTerm = escapeRegex(req.query.search.trim());
      const regex = new RegExp(safeTerm, 'i');
      query.$or = [
        { performedByEmail: regex },
        { action: regex },
        { resourceType: regex },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'name email role')
        .populate('targetUser', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export default { getAuditLogs };
