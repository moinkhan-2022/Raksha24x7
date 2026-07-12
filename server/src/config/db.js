import mongoose from 'mongoose';
import logger from './logger.js';

export const connectDB = async () => {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  await mongoose.connect(MONGODB_URI);
  logger.info('MongoDB connected');
};
