/**
 * Simple in-memory rate limiter for Edge Functions.
 *
 * Note: This is a basic rate limiter that works per edge function instance.
 * For production at scale, consider using Redis or a distributed cache.
 * Each edge function instance maintains its own counter, so limits are
 * per-instance, not global across all instances.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store for rate limit records
// Keys are `${userId}:${endpoint}` format
const requestCounts = new Map<string, RateLimitRecord>();

// Cleanup old entries periodically (runs on each check)
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (record.resetAt < now) {
      requestCounts.delete(key);
    }
  }
}

/**
 * Check if a request should be rate limited.
 *
 * @param userId - User identifier (from JWT)
 * @param endpoint - Function endpoint name for per-endpoint limits
 * @param limit - Maximum requests allowed in the window (default: 100)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Object with allowed status and remaining info
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  limit = 100,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  // Periodic cleanup
  if (Math.random() < 0.1) {
    cleanupExpiredEntries();
  }

  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const record = requestCounts.get(key);

  // No existing record or window expired - start fresh
  if (!record || record.resetAt < now) {
    const newRecord: RateLimitRecord = { count: 1, resetAt: now + windowMs };
    requestCounts.set(key, newRecord);
    return { allowed: true, remaining: limit - 1, resetAt: newRecord.resetAt };
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  // Increment and allow
  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

/**
 * Create a rate limit error response.
 */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}
