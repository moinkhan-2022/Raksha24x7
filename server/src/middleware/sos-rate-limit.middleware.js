const requestTracker = new Map();

const sosRateLimit = (req, res, next) => {
  const key = String(req.user?._id || req.ip);
  const now = Date.now();
  const last = requestTracker.get(key) || 0;

  if (now - last < 5000) {
    return res.status(429).json({ success: false, message: 'Too many SOS requests. Please wait a few seconds.' });
  }

  requestTracker.set(key, now);
  return next();
};

export default sosRateLimit;
