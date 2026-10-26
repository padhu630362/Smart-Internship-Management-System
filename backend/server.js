import http from 'http';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { logger } from './src/utils/logger.js';
import { initSocket } from './src/socket.js';
import { startJobScheduler, stopJobScheduler } from './src/services/jobScheduler.js';
import { initAdmins } from './src/config/initAdmins.js';

import { execSync } from 'child_process';

const server = http.createServer(app);
initSocket(server);

/**
 * Checks if the configured port is already occupied by another process.
 * If occupied by a stale process in development, safely frees it.
 */
const freePortIfOccupied = (port) => {
  if (process.env.NODE_ENV === 'test') return;
  try {
    if (process.platform === 'win32') {
      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 });
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes(`:${port}`) && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1], 10);
          if (pid && pid !== process.pid) {
            logger.warn(`Port ${port} is occupied by existing process (PID: ${pid}). Terminating conflict...`);
            try {
              process.kill(pid, 'SIGKILL');
            } catch {
              try {
                execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              } catch {}
            }
          }
        }
      }
    } else {
      const pidStr = execSync(`lsof -t -i:${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (pidStr) {
        const pids = pidStr.split('\n').map((p) => parseInt(p, 10)).filter((p) => p && p !== process.pid);
        for (const pid of pids) {
          logger.warn(`Port ${port} occupied by PID ${pid}. Terminating conflict...`);
          try {
            process.kill(pid, 'SIGKILL');
          } catch {}
        }
      }
    }
  } catch {
    // Port is free or command not available, proceed normally
  }
};

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${env.PORT} conflict detected (EADDRINUSE). Clearing stale process and retrying...`);
    freePortIfOccupied(env.PORT);
    setTimeout(() => {
      server.close();
      server.listen(env.PORT, () => {
        logger.info(`Port conflict resolved. Server listening on port ${env.PORT}`);
      });
    }, 1000);
  } else {
    logger.error('HTTP server error:', err);
    process.exit(1);
  }
});

const startServer = async () => {
  try {
    // Free port if previously occupied by a stale development process
    freePortIfOccupied(env.PORT);

    // Attempt database connection
    await connectDB();

    // Ensure designated administrators are securely configured in database with admin RBAC
    await initAdmins();

    server.listen(env.PORT, () => {
      logger.info(`Smart Internship Management System backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`Health check available at: http://localhost:${env.PORT}/api/health`);
      logger.info(`Database health check at: http://localhost:${env.PORT}/api/health/db`);
    });

    // Start background job aggregator and notification daemon
    startJobScheduler({ intervalMinutes: 60, initialDelayMs: 6000 });
  } catch (error) {
    logger.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  stopJobScheduler();
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDB();
    logger.info('Process terminated cleanly.');
    process.exit(0);
  });

  // Fallback close after 10 seconds if lingering operations exist
  setTimeout(() => {
    logger.warn('Forced shutdown timer completed.');
    process.exit(0);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export { server };
