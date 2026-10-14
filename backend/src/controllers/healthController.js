import { getDbStatus, pingDb } from '../config/db.js';
import { env } from '../config/env.js';

/**
 * Returns service health metrics, uptime, and database connection status.
 * Responds immediately using cached connection state without blocking.
 */
export const getHealth = (req, res) => {
  const dbStatus = getDbStatus();
  const isDbConnected = dbStatus.stateCode === 1;

  res.status(200).json({
    success: true,
    data: {
      status: isDbConnected ? 'healthy' : 'degraded',
      service: 'Smart Internship Management System - API',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      memoryUsageMB: {
        rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
      },
      database: {
        status: dbStatus.status,
        connected: isDbConnected,
        host: dbStatus.host || 'none'
      }
    }
  });
};

/**
 * Actively checks database connectivity separately with a strict timeout.
 * Prevents requests from hanging if MongoDB is unresponsive.
 */
export const getDatabaseHealth = async (req, res) => {
  // Use requested timeout or default to 2000ms (max 5000ms)
  const requestedTimeout = parseInt(req.query.timeout, 10);
  const timeoutMs = (!isNaN(requestedTimeout) && requestedTimeout > 0)
    ? Math.min(requestedTimeout, 5000)
    : 2000;

  const dbResult = await pingDb(timeoutMs);

  if (dbResult.connected) {
    return res.status(200).json({
      success: true,
      data: {
        service: 'database',
        status: 'connected',
        latencyMs: dbResult.latencyMs,
        host: dbResult.host,
        name: dbResult.name,
        timestamp: new Date().toISOString()
      }
    });
  }

  return res.status(503).json({
    success: false,
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: dbResult.error || 'Database connection unreachable',
      details: dbResult
    }
  });
};

export default { getHealth, getDatabaseHealth };
