import { NextResponse } from 'next/server';

interface RateLimitEntry {
  timestamps: number[];
}

// In-memory sliding window cache per identifier (IP, user ID, or tenant ID)
const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to avoid memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < 300000);
      if (entry.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 300000);
}

export interface RateLimitOptions {
  limit: number; // Max requests allowed
  windowMs: number; // Window size in milliseconds (e.g. 60000 = 1 minute)
}

/**
 * Evaluates rate limit for a given key using the Sliding Window Log algorithm.
 */
export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const windowStart = now - options.windowMs;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  const currentCount = entry.timestamps.length;
  const isAllowed = currentCount < options.limit;

  if (isAllowed) {
    entry.timestamps.push(now);
  }

  const remaining = Math.max(0, options.limit - entry.timestamps.length);
  const oldestTimestamp = entry.timestamps[0] || now;
  const resetInSeconds = Math.ceil((oldestTimestamp + options.windowMs - now) / 1000);

  return {
    isAllowed,
    limit: options.limit,
    remaining,
    resetInSeconds: Math.max(1, resetInSeconds),
  };
}

/**
 * Returns a 429 Too Many Requests response with standard Retry-After and rate limit headers.
 */
export function buildRateLimitResponse(
  limit: number,
  remaining: number,
  resetInSeconds: number
): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: `Has excedido el límite de peticiones permitido. Por favor reintenta en ${resetInSeconds} segundos.`,
      retryAfter: resetInSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': resetInSeconds.toString(),
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetInSeconds.toString(),
      },
    }
  );
}
