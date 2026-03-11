// In-memory rate limit store (resets on serverless cold start)
// For production, consider using Redis or Vercel KV
const rateLimitStore = new Map();

// Rate limit configuration
const RATE_LIMITS = {
  prayer_generation: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,      // 5 requests per minute
  },
  general: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
};

/**
 * Get client identifier from request
 */
function getClientId(req) {
  // Try to get real IP from various headers
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Clean up expired entries
 */
function cleanupExpired(limitType) {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.general;
  const now = Date.now();

  for (const [key, data] of rateLimitStore.entries()) {
    if (key.startsWith(limitType) && now - data.windowStart > config.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check rate limit for a request
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(req, limitType = 'general') {
  const clientId = getClientId(req);
  const key = `${limitType}:${clientId}`;
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.general;
  const now = Date.now();

  // Cleanup periodically
  if (Math.random() < 0.1) {
    cleanupExpired(limitType);
  }

  let data = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!data || now - data.windowStart > config.windowMs) {
    data = {
      windowStart: now,
      count: 0,
    };
  }

  // Increment count
  data.count++;
  rateLimitStore.set(key, data);

  const remaining = Math.max(0, config.maxRequests - data.count);
  const resetIn = Math.ceil((config.windowMs - (now - data.windowStart)) / 1000);

  return {
    allowed: data.count <= config.maxRequests,
    remaining,
    resetIn,
  };
}

/**
 * Apply rate limit headers to response
 */
export function applyRateLimitHeaders(res, limitResult, limitType = 'general') {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.general;

  res.setHeader('X-RateLimit-Limit', config.maxRequests);
  res.setHeader('X-RateLimit-Remaining', limitResult.remaining);
  res.setHeader('X-RateLimit-Reset', limitResult.resetIn);
}

/**
 * Send rate limit exceeded response
 */
export function sendRateLimitExceeded(res, limitResult) {
  res.status(429).json({
    error: 'Too many requests',
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    retryAfter: limitResult.resetIn,
  });
}
