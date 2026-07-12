const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 20;

const keyFor = (req) => `${req.ip || req.socket?.remoteAddress || 'unknown'}:${String(req.body?.email || '').toLowerCase()}`;

export const adminLoginRateLimit = (req, res, next) => {
  const key = keyFor(req);
  const now = Date.now();
  const record = attempts.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  if (record.resetAt <= now) {
    record.count = 0;
    record.resetAt = now + WINDOW_MS;
  }
  record.count += 1;
  attempts.set(key, record);
  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({ success: false, message: 'Too many admin login attempts. Please try again later.' });
  }
  return next();
};

export default adminLoginRateLimit;
