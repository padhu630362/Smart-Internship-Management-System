import { AppError } from '../utils/AppError.js';

/**
 * Native in-memory IP rate limiter middleware with sliding window.
 * Zero external dependencies.
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes default
  maxRequests = 10,
  message = 'Too many requests from this IP. Please try again later.',
  skipInTest = true,
} = {}) => {
  const ipHits = new Map();

  // Periodic cleanup of expired records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipHits.entries()) {
      if (now > record.resetTime) {
        ipHits.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref(); // unref so it does not block node shutdown

  return (req, res, next) => {
    // Skip rate limiting during automated test runs unless explicitly tested
    if (skipInTest && process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    const record = ipHits.get(ip);

    if (!record || now > record.resetTime) {
      ipHits.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return next(new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'));
    }

    next();
  };
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

export const exportRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many report export requests. Please wait a few minutes before downloading again.',
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many file uploads attempted. Please try again later.',
});

export default {
  createRateLimiter,
  authRateLimiter,
  exportRateLimiter,
  uploadRateLimiter,
};
