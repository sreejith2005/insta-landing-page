import { describe, expect, it, vi } from "vitest";

import { createRateLimiter } from "./create-limiter";
import { MemoryRateLimiter } from "./memory";
import { RedisRateLimiter } from "./redis";

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    class {
      limit = vi.fn(async () => ({ success: true, reset: Date.now() + 1000 }));
    },
    { fixedWindow: vi.fn(() => ({})) },
  ),
}));

describe("createRateLimiter", () => {
  it("falls back to the in-memory limiter when Upstash is not configured", () => {
    const limiter = createRateLimiter(
      { limit: 6, windowMs: 60_000, prefix: "ratelimit:lead" },
      {},
    );
    expect(limiter).toBeInstanceOf(MemoryRateLimiter);
  });

  it("falls back to the in-memory limiter when only one Upstash variable is set", () => {
    const limiter = createRateLimiter(
      { limit: 6, windowMs: 60_000, prefix: "ratelimit:lead" },
      { upstashUrl: "https://example.upstash.io" },
    );
    expect(limiter).toBeInstanceOf(MemoryRateLimiter);
  });

  it("uses the Redis-backed limiter when Upstash is fully configured", () => {
    const limiter = createRateLimiter(
      { limit: 6, windowMs: 60_000, prefix: "ratelimit:lead" },
      { upstashUrl: "https://example.upstash.io", upstashToken: "token" },
    );
    expect(limiter).toBeInstanceOf(RedisRateLimiter);
  });
});
