import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Resolve MongoDB Atlas SRV connection queries reliably across network/ISP environments
// where local/system DNS fails with querySrv ECONNREFUSED or ETIMEOUT
try {
  const customServers = process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean)
    : ['8.8.8.8', '1.1.1.1'];
  if (customServers.length > 0) {
    dns.setServers(customServers);
  }
} catch (dnsErr) {
  logger.warn(`Could not set custom DNS servers for MongoDB SRV resolution: ${dnsErr.message}`);
}

let isConnected = false;

const stateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

export const connectDB = async () => {
  if (isConnected) {
    logger.debug('MongoDB already connected.');
    return;
  }

  try {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info('MongoDB connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB connection lost/disconnected.');
    });

    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info(`MongoDB connected to host: ${conn.connection.host}`);
  } catch (error) {
    logger.warn(`MongoDB initial connection warning: ${error.message}`);
    logger.warn('Backend server will continue running in degraded mode until MongoDB is reachable.');
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed gracefully.');
  }
};

export const getDbStatus = () => {
  const readyState = mongoose.connection.readyState;
  return {
    stateCode: readyState,
    status: stateMap[readyState] || 'unknown',
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
};

/**
 * Actively pings the connected MongoDB instance with an explicit timeout.
 * Prevents hanging requests if the connection is wedged or stalling.
 */
export const pingDb = async (timeoutMs = 2000) => {
  const readyState = mongoose.connection.readyState;
  if (readyState !== 1 || !mongoose.connection.db) {
    return {
      connected: false,
      stateCode: readyState,
      status: stateMap[readyState] || 'disconnected',
      error: 'Database is not currently connected'
    };
  }

  const start = Date.now();
  try {
    const pingPromise = mongoose.connection.db.admin().ping();
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Database ping timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      if (timer.unref) timer.unref();
    });

    await Promise.race([pingPromise, timeoutPromise]);
    const latencyMs = Date.now() - start;

    return {
      connected: true,
      stateCode: 1,
      status: 'connected',
      latencyMs,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null
    };
  } catch (error) {
    return {
      connected: false,
      stateCode: mongoose.connection.readyState,
      status: stateMap[mongoose.connection.readyState] || 'disconnected',
      latencyMs: Date.now() - start,
      error: error.message
    };
  }
};

export default { connectDB, disconnectDB, getDbStatus, pingDb };
