/**
 * Simple in-memory rate limiter for eBay API.
 * Browse API: 5000 calls/day on basic tier.
 * Resets at midnight UTC.
 */

interface RateLimitState {
  count: number;
  resetAt: number;
}

const limits: Record<string, RateLimitState> = {};

function getMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

export function checkRateLimit(
  bucket: string,
  maxPerDay: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const state = limits[bucket];

  if (!state || now >= state.resetAt) {
    limits[bucket] = { count: 0, resetAt: getMidnightUTC() };
  }

  const current = limits[bucket];
  const remaining = maxPerDay - current.count;

  return { allowed: remaining > 0, remaining };
}

export function recordCall(bucket: string): void {
  if (limits[bucket]) {
    limits[bucket].count++;
  }
}
