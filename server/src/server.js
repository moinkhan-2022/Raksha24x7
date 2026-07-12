import './config/env.js';
import app from './app.js';
import { connectDB } from './config/db.js';
import { validateEnvironment } from './config/validateEnv.js';
import logger, { logError } from './config/logger.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnvironment();
    await connectDB();
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, { port: PORT, environment: process.env.NODE_ENV || 'development' });
    });

    server.on('error', (error) => {
      logError(error, { scope: 'server_listen', port: PORT });
      if (error.code === 'EADDRINUSE') logger.error(`Port ${PORT} is already in use.`);
    });
  } catch (error) {
    logError(error, { scope: 'server_start' });
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logError(reason instanceof Error ? reason : new Error(String(reason)), { scope: 'unhandled_rejection' });
});

process.on('uncaughtException', (error) => {
  logError(error, { scope: 'uncaught_exception' });
  process.exit(1);
});

startServer();
