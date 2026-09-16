import { describe, expect, it } from "vitest";

import { formatOfferDeadline } from "./offer";

const now = new Date("2026-09-16T12:00:00.000Z");

describe("formatOfferDeadline", () => {
  it("shows a configured future deadline in Indian time", () => {
    // 18:29:59Z is 23:59:59 IST on the 2nd; one second later is the 3rd.
    expect(formatOfferDeadline("2026-10-02T18:29:59.000Z", now)).toBe("2 October 2026");
    expect(formatOfferDeadline("2026-10-02T18:30:00.000Z", now)).toBe("3 October 2026");
  });

  it("shows nothing when no deadline is configured", () => {
    expect(formatOfferDeadline(undefined, now)).toBeUndefined();
    expect(formatOfferDeadline("", now)).toBeUndefined();
  });

  it("shows nothing once the deadline has passed, rather than a stale claim", () => {
    expect(formatOfferDeadline("2026-09-01T00:00:00.000Z", now)).toBeUndefined();
  });

  it("shows nothing for an unparseable value", () => {
    expect(formatOfferDeadline("soon", now)).toBeUndefined();
  });

  it("is identical for every visitor at a given moment", () => {
    expect(formatOfferDeadline("2026-12-25T00:00:00.000Z", now)).toBe(
      formatOfferDeadline("2026-12-25T00:00:00.000Z", now),
    );
  });
});
