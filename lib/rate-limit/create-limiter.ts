import { MemoryRateLimiter } from "./memory";
import { RedisRateLimiter } from "./redis";
import type { RateLimiter } from "./contracts";

/**
 * Picks a limiter without importing @upstash/redis when it is not needed:
 * Redis-backed in any environment where Upstash is configured, otherwise the
 * process-local limiter so `next dev` works without Redis configured.
 */
export function createRateLimiter(
  options: { limit: number; windowMs: number; prefix: string },
  env: { upstashUrl?: string; upstashToken?: string } = {
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
): RateLimiter {
  if (env.upstashUrl && env.upstashToken) {
    return new RedisRateLimiter({ ...options, url: env.upstashUrl, token: env.upstashToken });
  }
  return new MemoryRateLimiter(options);
}
