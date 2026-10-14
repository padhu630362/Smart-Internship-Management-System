import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

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
      serverSelectionTimeoutMS: 10000,
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

export default { connectDB, disconnectDB, getDbStatus };
