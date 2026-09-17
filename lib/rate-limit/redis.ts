import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import type { RateLimiter } from "./contracts";

/**
 * Fixed-window limiter backed by Upstash Redis over HTTPS, so it works from
 * Vercel serverless functions without a persistent connection and stays
 * correct across horizontally scaled instances (unlike the in-memory limiter
 * it replaces in production).
 */
export class RedisRateLimiter implements RateLimiter {
  private readonly limiter: Ratelimit;

  constructor(options: {
    limit: number;
    windowMs: number;
    url: string;
    token: string;
    prefix: string;
  }) {
    const redis = new Redis({ url: options.url, token: options.token });
    this.limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(options.limit, `${options.windowMs} ms`),
      prefix: options.prefix,
      analytics: false,
    });
  }

  async check(key: string) {
    const result = await this.limiter.limit(key);
    return {
      allowed: result.success,
      retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  }
}
