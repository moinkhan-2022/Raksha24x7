import os from 'node:os';
import mongoose from 'mongoose';
import { performanceLog } from '../config/logger.js';
import { emailProviderStatus } from '../email/services/emailProvider.service.js';

const metrics = {
  startedAt: new Date(),
  totalRequests: 0,
  totalResponseTimeMs: 0,
  statusCounts: {},
  slowRequests: [],
  recentErrors: [],
  memoryWarnings: []
};

const maxItems = 50;
const slowThresholdMs = Number(process.env.SLOW_REQUEST_THRESHOLD_MS || 1000);
const memoryThresholdRatio = Number(process.env.MEMORY_WARNING_RATIO || 0.85);

const pushLimited = (list, item) => {
  list.unshift(item);
  if (list.length > maxItems) list.length = maxItems;
};

export const recordRequestMetric = ({ method, url, statusCode, durationMs, requestId, userId, adminId }) => {
  metrics.totalRequests += 1;
  metrics.totalResponseTimeMs += durationMs;
  metrics.statusCounts[statusCode] = (metrics.statusCounts[statusCode] || 0) + 1;

  if (durationMs >= slowThresholdMs) {
    const slowRequest = { method, url, statusCode, durationMs, requestId, userId, adminId, at: new Date() };
    pushLimited(metrics.slowRequests, slowRequest);
    performanceLog.warn('Slow API request detected', slowRequest);
  }
};

export const recordErrorMetric = ({ message, statusCode = 500, requestId, path, method }) => {
  pushLimited(metrics.recentErrors, { message, statusCode, requestId, path, method, at: new Date() });
};

export const recordTimedOperation = async (name, task, metadata = {}) => {
  const start = performance.now();
  try {
    return await task();
  } finally {
    const durationMs = Math.round(performance.now() - start);
    performanceLog.info('Timed operation completed', { name, durationMs, ...metadata });
  }
};

export const checkMemoryHealth = () => {
  const memory = process.memoryUsage();
  const ratio = memory.heapTotal ? memory.heapUsed / memory.heapTotal : 0;
  if (ratio >= memoryThresholdRatio) {
    const warning = {
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      ratio: Number(ratio.toFixed(3)),
      at: new Date()
    };
    pushLimited(metrics.memoryWarnings, warning);
    performanceLog.warn('High memory usage detected', warning);
  }
  return memory;
};

export const getMetricsSnapshot = () => {
  const averageResponseTimeMs = metrics.totalRequests
    ? Math.round(metrics.totalResponseTimeMs / metrics.totalRequests)
    : 0;
  return {
    startedAt: metrics.startedAt,
    totalRequests: metrics.totalRequests,
    averageResponseTimeMs,
    statusCounts: metrics.statusCounts,
    slowThresholdMs,
    slowRequests: metrics.slowRequests,
    recentErrors: metrics.recentErrors,
    memoryWarnings: metrics.memoryWarnings
  };
};

export const getHealthSnapshot = async () => {
  const memory = checkMemoryHealth();
  const cpuUsage = process.cpuUsage();
  const database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const email = emailProviderStatus();
  let mongoPingMs = null;

  if (database === 'connected') {
    const start = performance.now();
    await mongoose.connection.db.admin().ping();
    mongoPingMs = Math.round(performance.now() - start);
  }

  return {
    status: database === 'connected' ? 'healthy' : 'degraded',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: Math.round(process.uptime()),
    currentTime: new Date().toISOString(),
    memoryUsage: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
      arrayBuffers: memory.arrayBuffers
    },
    cpuUsage,
    loadAverage: os.loadavg(),
    database,
    mongoPingMs,
    smtp: email.smtpConfigured || email.resendConfigured ? 'configured' : 'not_configured',
    emailProvider: email.provider,
    jwt: process.env.JWT_SECRET && process.env.ADMIN_JWT_SECRET ? 'configured' : 'missing',
    version: process.env.npm_package_version || '1.0.0',
    metrics: getMetricsSnapshot()
  };
};
