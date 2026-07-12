import { logError, logSecurityEvent } from '../config/logger.js';
import { recordErrorMetric } from '../services/monitoring.service.js';

export const notFoundHandler = (req, res) => res.status(404).json({
  success: false,
  message: 'API route not found.',
  requestId: req.requestId
});

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error?.message === 'CORS origin not allowed.') {
    logSecurityEvent('CORS origin blocked', { requestId: req.requestId, ip: req.ip, path: req.originalUrl, origin: req.headers.origin });
    return res.status(403).json({ success: false, message: 'CORS origin not allowed.', requestId: req.requestId });
  }

  const status = Number(error?.status || error?.statusCode || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = safeStatus >= 500 ? 'Internal server error.' : (error?.message || 'Request failed.');

  recordErrorMetric({ message: error?.message || message, statusCode: safeStatus, requestId: req.requestId, path: req.originalUrl, method: req.method });
  logError(error, {
    requestId: req.requestId,
    statusCode: safeStatus,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id ? String(req.user._id) : undefined,
    adminId: req.admin?._id ? String(req.admin._id) : undefined
  });

  return res.status(safeStatus).json({
    success: false,
    message,
    requestId: req.requestId,
    ...(isProduction ? {} : { stack: error?.stack })
  });
};
