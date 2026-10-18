/**
 * Production-grade rate limiting with per-user and per-IP tracking
 * Returns 429 when limits exceeded
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
  firstSeen: number;
}

class RateLimitStore {
  private store = new Map<string, RateLimitRecord>();

  // Clean up expired entries every 5 minutes
  constructor() {
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetAt) {
        this.store.delete(key);
      }
    }
  }

  check(
    key: string,
    maxAttempts: number,
    windowMs: number,
  ): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      const newRecord: RateLimitRecord = {
        count: 1,
        resetAt: now + windowMs,
        firstSeen: now,
      };
      this.store.set(key, newRecord);
      return { allowed: true, remaining: maxAttempts - 1, resetAt: newRecord.resetAt };
    }

    if (record.count >= maxAttempts) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }

    record.count++;
    return {
      allowed: true,
      remaining: maxAttempts - record.count,
      resetAt: record.resetAt,
    };
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

const store = new RateLimitStore();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

/**
 * Rate limit by user ID
 */
export function checkRateLimitByUser(
  userId: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${config.keyPrefix}:user:${userId}`;
  return store.check(key, config.maxRequests, config.windowMs);
}

/**
 * Rate limit by IP address
 */
export function checkRateLimitByIp(
  ip: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${config.keyPrefix}:ip:${ip}`;
  return store.check(key, config.maxRequests, config.windowMs);
}

/**
 * Rate limit configs for different endpoint types
 */
export const RATE_LIMITS = {
  // AI endpoints: 20 requests per minute per user
  AI_ANALYSIS: {
    maxRequests: 20,
    windowMs: 60 * 1000,
    keyPrefix: "ai",
  },
  // AWS sync endpoints: 10 requests per minute per user (expensive AWS API calls)
  AWS_SYNC: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    keyPrefix: "aws-sync",
  },
  // AWS connection (credential validation): 5 per hour per IP
  AWS_CONNECT: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: "aws-connect",
  },
  // Autopilot (full agent run): 30 per hour per user
  AUTOPILOT: {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000,
    keyPrefix: "autopilot",
  },
  // Generic expensive operations: 60 per minute per user
  EXPENSIVE: {
    maxRequests: 60,
    windowMs: 60 * 1000,
    keyPrefix: "expensive",
  },
} as const;

/**
 * Extract IP address from request, handling proxies
 */
export function getClientIp(request: Request): string {
  // Check Cloudflare headers first
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // Check standard proxy headers
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // Take the first IP (client IP)
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp;

  // Fallback (should not happen in production)
  return "unknown";
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
      },
    },
  );
}
