function createRateLimit({ windowMs = 15 * 60 * 1000, max = 10, message = 'Too many requests. Please try again later.' } = {}) {
  const buckets = new Map();
  const duration = Number(windowMs);
  const limit = Number(max);
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isInteger(limit) || limit < 1) {
    throw new Error('Rate limiter requires a positive windowMs and integer max.');
  }

  return (req, res, next) => {
    const now = Date.now();
    // req.ip is safe only when Express trust-proxy settings match the real proxy topology.
    const ip = String(req.ip || req.socket?.remoteAddress || 'unknown');
    let bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + duration };
      buckets.set(ip, bucket);
    }
    if (bucket.count >= limit) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ message });
    }
    bucket.count += 1;
    if (buckets.size > 10000) {
      for (const [key, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(key);
      }
      if (buckets.size > 10000) {
        return res.status(503).json({ message: 'Authentication service is temporarily busy.' });
      }
    }
    return next();
  };
}

module.exports = createRateLimit;
