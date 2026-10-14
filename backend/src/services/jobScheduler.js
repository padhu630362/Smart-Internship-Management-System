import { syncAllJobFeeds } from './jobFeedService.js';
import { logger } from '../utils/logger.js';

let schedulerInterval = null;
let isSyncInProgress = false;

/**
 * Executes a single synchronized job poll cycle with lock protection
 */
export const runJobSyncCycle = async ({ notify = true } = {}) => {
  if (isSyncInProgress) {
    logger.info('External job sync is already running in background. Skipping duplicate trigger.');
    return { skipped: true, reason: 'in_progress' };
  }

  isSyncInProgress = true;
  const startTime = Date.now();

  try {
    const result = await syncAllJobFeeds({ notifyUsers: notify });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`Job sync cycle finished in ${duration}s. New: ${result.newCount}, Synced: ${result.syncedCount}, Total Active: ${result.totalActive}`);
    return result;
  } catch (error) {
    logger.error('Error during scheduled job sync cycle:', error);
    return { error: error.message };
  } finally {
    isSyncInProgress = false;
  }
};

/**
 * Initializes the background scheduler daemon
 */
export const startJobScheduler = ({ intervalMinutes = 60, initialDelayMs = 5000 } = {}) => {
  if (schedulerInterval) {
    logger.info('Job scheduler is already active.');
    return;
  }

  const intervalMs = Math.max(10, parseInt(process.env.JOB_SYNC_INTERVAL_MINUTES) || intervalMinutes) * 60 * 1000;

  logger.info(`Starting background job scheduler. Next sync will run every ${intervalMs / 60000} minute(s).`);

  // Initial delayed boot run
  setTimeout(() => {
    runJobSyncCycle({ notify: true }).catch((err) => {
      logger.warn(`Initial job scheduler run encountered error: ${err.message}`);
    });
  }, initialDelayMs);

  // Periodic interval
  schedulerInterval = setInterval(() => {
    runJobSyncCycle({ notify: true }).catch((err) => {
      logger.warn(`Scheduled job sync error: ${err.message}`);
    });
  }, intervalMs);

  // Unref timer so it doesn't hold open test runners if loaded in tests
  if (schedulerInterval.unref) {
    schedulerInterval.unref();
  }
};

/**
 * Stops the background scheduler daemon
 */
export const stopJobScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Background job scheduler successfully stopped.');
  }
};

export default {
  runJobSyncCycle,
  startJobScheduler,
  stopJobScheduler,
};

