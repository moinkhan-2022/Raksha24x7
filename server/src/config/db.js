import mongoose from 'mongoose';
import logger from './logger.js';
import { appConfig } from './appConfig.js';

const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export const connectDB = async () => {
  const { uri, retryAttempts, retryDelayMS, ...options } = appConfig.mongo;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (error) => logger.error('MongoDB connection error', { message: error.message }));

  let lastError;
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        maxPoolSize: options.maxPoolSize,
        minPoolSize: options.minPoolSize,
        serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
        socketTimeoutMS: options.socketTimeoutMS,
        connectTimeoutMS: options.connectTimeoutMS,
        retryWrites: true
      });
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      logger.error('MongoDB connection attempt failed', { attempt, retryAttempts, message: error.message });
      if (attempt < retryAttempts) await wait(retryDelayMS);
    }
  }

  throw lastError;
};

export const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed');
  }
};
