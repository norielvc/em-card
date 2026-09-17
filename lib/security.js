/**
 * Lightweight in-memory rate limiter.
 * NOTE: In serverless environments (Vercel/Netlify), this resets per invocation.
 * It still protects against rapid burst attacks on warm instances.
 * For persistent cross-instance rate limiting, upgrade to Redis/Upstash.
 */
const rateLimitStore = new Map();

export function rateLimit(request, options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const maxRequests = options.max || 30; // 30 requests per window
  const key = options.key || getClientIP(request);
  const storeKey = `${key}:${request.method}:${new URL(request.url).pathname}`;

  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing entries for this key
  const entries = rateLimitStore.get(storeKey) || [];

  // Filter entries within current window
  const validEntries = entries.filter((t) => t > windowStart);

  if (validEntries.length >= maxRequests) {
    const oldestInWindow = validEntries[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
    };
  }

  // Add current request timestamp
  validEntries.push(now);
  rateLimitStore.set(storeKey, validEntries);

  // Cleanup old entries periodically (every ~1000 entries)
  if (rateLimitStore.size > 1000) {
    for (const [k, timestamps] of rateLimitStore) {
      const filtered = timestamps.filter((t) => t > windowStart);
      if (filtered.length === 0) rateLimitStore.delete(k);
      else rateLimitStore.set(k, filtered);
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - validEntries.length,
  };
}

/**
 * Extract client IP from request headers (handles proxies like Cloudflare/Vercel/Netlify).
 */
export function getClientIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown'
  );
}

/**
 * Check if authenticated user has admin role.
 * Returns 403 response if not admin, null if admin.
 */
export function requireAdmin(user) {
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const role = user.user_metadata?.role || 'admin';
  if (role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

/**
 * Check if authenticated user has finance role.
 * Only role === 'finance' is allowed (even admin is forbidden).
 * Returns 403 response if not finance, null if authorized.
 */
export function requireFinance(user) {
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const role = user.user_metadata?.role;
  if (role !== 'finance') {
    return new Response(JSON.stringify({ error: 'Forbidden: Strictly restricted to Finance role' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

