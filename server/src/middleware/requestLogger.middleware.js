import crypto from 'node:crypto';
import { requestLog } from '../config/logger.js';
import { recordRequestMetric } from '../services/monitoring.service.js';

const requestSize = (req) => {
  const length = req.headers['content-length'];
  if (length) return Number(length) || 0;
  if (!req.body) return 0;
  try {
    return Buffer.byteLength(JSON.stringify(req.body));
  } catch {
    return 0;
  }
};

export const requestContext = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = String(requestId);
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

export const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  const originalWrite = res.write;
  const originalEnd = res.end;
  let responseSize = 0;

  res.write = function write(chunk, ...args) {
    if (chunk) responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
    return originalWrite.call(this, chunk, ...args);
  };

  res.end = function end(chunk, ...args) {
    if (chunk) responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
    return originalEnd.call(this, chunk, ...args);
  };

  res.on('finish', () => {
    const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1_000_000);
    const entry = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
      userId: req.user?._id ? String(req.user._id) : undefined,
      adminId: req.admin?._id ? String(req.admin._id) : undefined,
      statusCode: res.statusCode,
      durationMs,
      requestSize: requestSize(req),
      responseSize
    };

    recordRequestMetric(entry);
    requestLog.http('API request completed', entry);
  });

  next();
};
