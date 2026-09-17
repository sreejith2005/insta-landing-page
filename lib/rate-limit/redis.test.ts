import { describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    class {
      limit = limitMock;
    },
    { fixedWindow: vi.fn(() => ({})) },
  ),
}));

const { RedisRateLimiter } = await import("./redis");

describe("RedisRateLimiter", () => {
  it("reports the retry-after window from Upstash's reset time on a denial", async () => {
    const now = Date.now();
    limitMock.mockResolvedValueOnce({ success: false, reset: now + 5_000 });
    const limiter = new RedisRateLimiter({
      limit: 2,
      windowMs: 60_000,
      url: "https://example.upstash.io",
      token: "token",
      prefix: "ratelimit:lead",
    });
    const result = await limiter.check("lead:1.2.3.4");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(4);
  });

  it("allows a request under the limit", async () => {
    limitMock.mockResolvedValueOnce({ success: true, reset: Date.now() + 60_000 });
    const limiter = new RedisRateLimiter({
      limit: 2,
      windowMs: 60_000,
      url: "https://example.upstash.io",
      token: "token",
      prefix: "ratelimit:lead",
    });
    const result = await limiter.check("lead:1.2.3.4");
    expect(result.allowed).toBe(true);
  });
});
