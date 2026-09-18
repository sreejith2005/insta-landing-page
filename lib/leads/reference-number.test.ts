import { describe, expect, it, vi } from "vitest";

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

const { createReferenceNumberSource, redisReferenceCounter, referenceMonth } = await import("./reference-number");

describe("referenceMonth", () => {
  it("rolls over on India Standard Time, not UTC", () => {
    // 20:00 UTC on 31 Aug is 01:30 IST on 1 Sep.
    expect(referenceMonth(new Date("2026-08-31T20:00:00.000Z"))).toBe("2609");
    expect(referenceMonth(new Date("2026-08-31T18:00:00.000Z"))).toBe("2608");
  });
});

describe("createReferenceNumberSource", () => {
  const date = new Date("2026-09-17T14:13:04.000Z");

  it("formats an INCR on the month key as MK-YYMM-0000", async () => {
    const incr = vi.fn().mockResolvedValue(42);
    const next = createReferenceNumberSource({ incr });
    expect(await next(date)).toBe("MK-2609-0042");
    expect(incr).toHaveBeenCalledWith("mk:ref:2609");
  });

  it("falls back to a random reference when Redis fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const next = createReferenceNumberSource({ incr: vi.fn().mockRejectedValue(new Error("down")) });
    expect(await next(date)).toMatch(/^MK-2609-[0-9A-F]{8}$/);
  });

  it("issues random references when Redis is not configured", async () => {
    expect(redisReferenceCounter({})).toBeUndefined();
    expect(await createReferenceNumberSource(undefined)(date)).toMatch(/^MK-2609-[0-9A-F]{8}$/);
  });
});
