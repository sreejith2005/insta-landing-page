import type { RateLimiter } from "./contracts";

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly options: { limit: number; windowMs: number }) {}
  async check(key: string) {
    const now = Date.now();
    const current = this.buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + this.options.windowMs } : current;
    bucket.count += 1;
    this.buckets.set(key, bucket);
    return { allowed: bucket.count <= this.options.limit, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
}
