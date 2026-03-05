/**
 * In-memory rate limiter for Next.js Edge Runtime.
 *
 * - Map-based storage (Edge compatible, no Node.js-only APIs)
 * - Sliding window algorithm per key
 * - Automatic cleanup of stale entries every 5 minutes
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();

  constructor(
    private readonly windowMs: number,
    readonly maxRequests: number,
  ) {
    // Cleanup stale entries every 5 minutes
    if (typeof globalThis.setInterval !== "undefined") {
      globalThis.setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /** Check whether the request identified by `key` is within the rate limit. */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    // No entry or window expired → allow and start new window
    if (!entry || entry.resetAt <= now) {
      const resetAt = now + this.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: this.maxRequests - 1, resetAt, limit: this.maxRequests };
    }

    // Window still active – check count
    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit: this.maxRequests };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
      limit: this.maxRequests,
    };
  }

  /** Remove expired entries to prevent memory leaks. */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instances – different limits per endpoint category
// ---------------------------------------------------------------------------

/** Auth endpoints: 60 requests per minute per IP (handles dev HMR + frequent useSession polls). */
export const authLimiter = new RateLimiter(60_000, 60);

/** tRPC mutation endpoints: 30 requests per minute per IP. */
export const mutationLimiter = new RateLimiter(60_000, 30);

/** Public / query endpoints: 60 requests per minute per IP. */
export const queryLimiter = new RateLimiter(60_000, 60);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a client identifier (IP address) from the incoming request. */
export function getClientId(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return `ip:${forwarded.split(",")[0]!.trim()}`;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return `ip:${realIp}`;
  }
  return "ip:unknown";
}
