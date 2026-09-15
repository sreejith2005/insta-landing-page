export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };
export interface RateLimiter { check(key: string): Promise<RateLimitResult>; }
