import crypto from 'crypto';

export const hashPushToken = (token = '') => crypto
  .createHash('sha256')
  .update(String(token))
  .digest('hex');

export const sanitizeNotificationPayload = (payload = {}) => {
  const safeString = (value, max = 180) => String(value || '').replace(/[<>]/g, '').slice(0, max).trim();
  const allowedActions = new Set(['open-app', 'view-notification', 'open-sos', 'open-nearby', 'call-emergency', 'dismiss']);
  return {
    notificationId: safeString(payload.notificationId || `${Date.now()}`, 80),
    type: safeString(payload.type || 'general', 60),
    title: safeString(payload.title || 'Raksha24x7', 80),
    message: safeString(payload.message || '', 220),
    actionPath: safeString(payload.actionPath || '/dashboard', 120),
    priority: ['low', 'normal', 'high', 'critical'].includes(payload.priority) ? payload.priority : 'normal',
    actions: Array.isArray(payload.actions)
      ? payload.actions
        .filter((item) => allowedActions.has(item?.action))
        .slice(0, 2)
        .map((item) => ({ action: item.action, title: safeString(item.title, 32) }))
      : [],
    metadata: typeof payload.metadata === 'object' && payload.metadata !== null ? payload.metadata : {}
  };
};

const buckets = new Map();

export const isNotificationRateLimited = (userId, limit = 30, windowMs = 60_000) => {
  const key = String(userId || 'anonymous');
  const now = Date.now();
  const current = (buckets.get(key) || []).filter((time) => now - time < windowMs);
  if (current.length >= limit) {
    buckets.set(key, current);
    return true;
  }
  current.push(now);
  buckets.set(key, current);
  return false;
};
