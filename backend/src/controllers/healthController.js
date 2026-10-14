import { getDbStatus } from '../config/db.js';
import { env } from '../config/env.js';

/**
 * Returns service health metrics, uptime, and database connection status.
 */
export const getHealth = (req, res) => {
  const dbStatus = getDbStatus();

  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
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
        connected: dbStatus.stateCode === 1,
        host: dbStatus.host || 'none'
      }
    }
  });
};

export default { getHealth };
