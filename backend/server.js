import http from 'http';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { logger } from './src/utils/logger.js';
import { initSocket } from './src/socket.js';

const server = http.createServer(app);
initSocket(server);

const startServer = async () => {
  try {
    // Attempt database connection
    await connectDB();

    server.listen(env.PORT, () => {
      logger.info(`Smart Internship Management System backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`Health check available at: http://localhost:${env.PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDB();
    logger.info('Process terminated cleanly.');
    process.exit(0);
  });

  // Force close after 10 seconds if lingering connections exist
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout.');
    process.exit(1);
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
