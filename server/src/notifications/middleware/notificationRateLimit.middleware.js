const buckets = new Map();

export const notificationCreateRateLimit = (limit = 30, windowMs = 60_000) => (req, res, next) => {
  const key = String(req.user?._id || req.ip);
  const now = Date.now();
  const bucket = (buckets.get(key) || []).filter((time) => now - time < windowMs);
  if (bucket.length >= limit) {
    buckets.set(key, bucket);
    return res.status(429).json({ success: false, message: 'Too many notification requests.' });
  }
  bucket.push(now);
  buckets.set(key, bucket);
  return next();
};
