import { describe, expect, it } from "vitest";

import { MemoryRateLimiter } from "./memory";

describe("MemoryRateLimiter", () => {
  it("limits a key inside a fixed window", async () => {
    const limiter = new MemoryRateLimiter({ limit: 2, windowMs: 60_000 });
    expect((await limiter.check("lead:1")).allowed).toBe(true);
    expect((await limiter.check("lead:1")).allowed).toBe(true);
    expect((await limiter.check("lead:1")).allowed).toBe(false);
  });
});
