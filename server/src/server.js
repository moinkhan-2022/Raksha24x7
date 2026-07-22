import './config/env.js';
import app from './app.js';
import { closeDB, connectDB } from './config/db.js';
import { validateEnvironment } from './config/validateEnv.js';
import logger, { logError } from './config/logger.js';
import { appConfig } from './config/appConfig.js';
import { verifyEmailProvider } from './email/services/emailProvider.service.js';
import { startBackupScheduler } from './services/backup.service.js';

const PORT = appConfig.port;
let server;

const gracefulShutdown = async (signal) => {
  logger.info('Graceful shutdown requested', { signal });
  if (server) {
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
    return;
  }
  await closeDB();
  process.exit(0);
};

const startServer = async () => {
  try {
    validateEnvironment();
    await connectDB();
    if (process.env.EMAIL_VERIFY_ON_STARTUP === 'true') {
  try {
    await verifyEmailProvider();
    logger.info('Email provider verification successful');
  } catch (error) {
    logError(error, { scope: 'email_provider_startup_verification' });

    // Email failure must not stop the entire API server.
    logger.warn(
      'Email provider verification failed. Server will continue without verified email delivery.'
    );
  }
}
    startBackupScheduler();
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, { port: PORT, environment: process.env.NODE_ENV || 'development' });
    });

    server.on('error', (error) => {
      logError(error, { scope: 'server_listen', port: PORT });
      if (error.code === 'EADDRINUSE') logger.error(`Port ${PORT} is already in use.`);
    });
  } catch (error) {
    console.error("========== SERVER START ERROR ==========");
    console.error(error);
    console.error(error.stack);

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

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
