/**
 * tRPC Throttling Middleware
 * Implements request throttling and rate limiting for tRPC procedures
 */

import { TRPCError } from "@trpc/server";
import { userRequestRateLimiter, ipRateLimiter } from "./rateLimiting";
import type { TrpcContext } from "./_core/context";

/**
 * Get client IP from request
 */
function getClientIp(req: TrpcContext["req"]): string {
  // Check for IP from various headers (proxy, load balancer, etc.)
  const forwarded = (req.headers as any)["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const clientIp = (req.headers as any)["x-client-ip"];
  if (clientIp) {
    return clientIp;
  }

  // Fallback to socket address
  return (req.socket as any)?.remoteAddress || "unknown";
}

/**
 * Throttle by user ID
 * Limits requests per user to prevent abuse
 */
export function createUserThrottleMiddleware(
  maxRequestsPerMinute: number = 100
) {
  return async (opts: any) => {
    const { ctx, next } = opts;

    // Skip throttling for unauthenticated requests
    if (!ctx.user) {
      return next();
    }

    const userId = ctx.user.id;
    const rateLimitKey = `user:${userId}`;

    // Check rate limit
    if (!userRequestRateLimiter.isAllowed(rateLimitKey)) {
      const resetTime = userRequestRateLimiter.getResetTime(rateLimitKey);
      const waitTime = resetTime
        ? Math.ceil((resetTime - Date.now()) / 1000)
        : 60;

      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many requests. Please try again in ${waitTime} seconds.`,
      });
    }

    return next();
  };
}

/**
 * Throttle by IP address
 * Limits requests per IP to prevent abuse from single source
 */
export function createIpThrottleMiddleware(
  maxRequestsPerHour: number = 1000
) {
  return async (opts: any) => {
    const { ctx, next } = opts;

    const clientIp = getClientIp(ctx.req);
    const rateLimitKey = `ip:${clientIp}`;

    // Check rate limit
    if (!ipRateLimiter.isAllowed(rateLimitKey)) {
      const resetTime = ipRateLimiter.getResetTime(rateLimitKey);
      const waitTime = resetTime
        ? Math.ceil((resetTime - Date.now()) / 1000)
        : 3600;

      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many requests from this IP. Please try again in ${waitTime} seconds.`,
      });
    }

    return next();
  };
}

/**
 * Combined throttle middleware
 * Applies both user and IP-based throttling
 */
export function createCombinedThrottleMiddleware(
  userMaxRequestsPerMinute: number = 100,
  ipMaxRequestsPerHour: number = 1000
) {
  const userThrottle = createUserThrottleMiddleware(userMaxRequestsPerMinute);
  const ipThrottle = createIpThrottleMiddleware(ipMaxRequestsPerHour);

  return async (opts: any) => {
    // Apply IP throttle first (catches obvious abuse)
    await ipThrottle(opts);

    // Apply user throttle if authenticated
    if (opts.ctx.user) {
      await userThrottle(opts);
    }

    return opts.next();
  };
}

/**
 * Adaptive throttle middleware
 * Adjusts rate limits based on error rates and system load
 */
export class AdaptiveThrottle {
  private errorCount: number = 0;
  private successCount: number = 0;
  private lastResetTime: number = Date.now();
  private resetInterval: number = 60000; // 1 minute
  private baseLimit: number;
  private minLimit: number;
  private maxLimit: number;
  private currentLimit: number;

  constructor(
    baseLimit: number = 100,
    minLimit: number = 10,
    maxLimit: number = 1000
  ) {
    this.baseLimit = baseLimit;
    this.minLimit = minLimit;
    this.maxLimit = maxLimit;
    this.currentLimit = baseLimit;

    // Reset counters periodically
    setInterval(() => {
      this.resetCounters();
    }, this.resetInterval);
  }

  /**
   * Check if request is allowed and update counters
   */
  isAllowed(key: string): boolean {
    const now = Date.now();

    // Reset if interval has passed
    if (now - this.lastResetTime > this.resetInterval) {
      this.resetCounters();
    }

    // For simplicity, use a basic counter
    // In production, you'd track per-key
    const totalRequests = this.successCount + this.errorCount;

    if (totalRequests >= this.currentLimit) {
      this.errorCount++;
      return false;
    }

    this.successCount++;
    return true;
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.successCount++;
    this.adjustLimit();
  }

  /**
   * Record a failed operation
   */
  recordError(): void {
    this.errorCount++;
    this.adjustLimit();
  }

  /**
   * Adjust limit based on error rate
   */
  private adjustLimit(): void {
    const totalRequests = this.successCount + this.errorCount;
    if (totalRequests === 0) {
      return;
    }

    const errorRate = this.errorCount / totalRequests;

    if (errorRate > 0.5) {
      // High error rate, reduce limit
      this.currentLimit = Math.max(
        this.minLimit,
        Math.floor(this.currentLimit * 0.8)
      );
    } else if (errorRate < 0.1) {
      // Low error rate, increase limit
      this.currentLimit = Math.min(
        this.maxLimit,
        Math.floor(this.currentLimit * 1.2)
      );
    }
  }

  /**
   * Reset counters
   */
  private resetCounters(): void {
    this.errorCount = 0;
    this.successCount = 0;
    this.lastResetTime = Date.now();
  }

  /**
   * Get current limit
   */
  getLimit(): number {
    return this.currentLimit;
  }

  /**
   * Get current error rate
   */
  getErrorRate(): number {
    const total = this.successCount + this.errorCount;
    return total > 0 ? this.errorCount / total : 0;
  }
}

/**
 * Create adaptive throttle middleware
 */
export function createAdaptiveThrottleMiddleware(
  baseLimit: number = 100,
  minLimit: number = 10,
  maxLimit: number = 1000
) {
  const adaptiveThrottle = new AdaptiveThrottle(baseLimit, minLimit, maxLimit);

  return async (opts: any) => {
    const { ctx, next } = opts;

    const clientIp = getClientIp(ctx.req);
    const key = ctx.user ? `user:${ctx.user.id}` : `ip:${clientIp}`;

    if (!adaptiveThrottle.isAllowed(key)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many requests. Current limit: ${adaptiveThrottle.getLimit()} requests per minute.`,
      });
    }

    try {
      const result = await next();
      adaptiveThrottle.recordSuccess();
      return result;
    } catch (error) {
      adaptiveThrottle.recordError();
      throw error;
    }
  };
}
