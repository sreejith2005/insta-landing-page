import { describe, expect, it } from "vitest";

import { normalizeDmTimestamp, normalizeInstagramUsername } from "./instagram-dm";

describe("normalizeInstagramUsername", () => {
  it("strips a leading @ and whitespace", () => {
    expect(normalizeInstagramUsername("  @mk.jewels_fan ")).toBe("mk.jewels_fan");
  });

  it.each([undefined, "", "  ", "@"])("treats %j as absent", (value) => {
    expect(normalizeInstagramUsername(value)).toBeUndefined();
  });
});

describe("normalizeDmTimestamp", () => {
  const iso = "2026-09-17T14:13:04.000Z";

  it("accepts Unix milliseconds", () => {
    expect(normalizeDmTimestamp(String(Date.parse(iso)))).toBe(iso);
  });

  it("accepts Unix seconds", () => {
    expect(normalizeDmTimestamp(String(Date.parse(iso) / 1000))).toBe(iso);
  });

  it("normalizes an offset ISO string to UTC", () => {
    expect(normalizeDmTimestamp("2026-09-17T19:43:04+05:30")).toBe(iso);
  });

  it.each([undefined, "", "{{timestamp}}", "not-a-date", "9999999999999999"])("drops %j", (value) => {
    expect(normalizeDmTimestamp(value)).toBeUndefined();
  });
});
