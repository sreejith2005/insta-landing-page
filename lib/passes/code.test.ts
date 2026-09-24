import { describe, expect, it } from "vitest";

import { generatePassCode, normalizePassCode, PASS_CODE_PATTERN, passToken, verifyPassToken } from "./code";

const secret = "test-secret-that-is-long-enough-for-hmac-000";

describe("pass codes", () => {
  it("generates prefixed, readable, unique codes", () => {
    const codes = new Set(Array.from({ length: 500 }, () => generatePassCode("MK30")));
    expect(codes.size).toBe(500);
    for (const code of codes) {
      expect(code).toMatch(PASS_CODE_PATTERN);
      expect(code.startsWith("MK30-")).toBe(true);
      expect(code.slice(5)).not.toMatch(/[ILOU]/);
    }
  });

  it("forgives case, spacing, missing dashes and look-alike letters when typed", () => {
    expect(normalizePassCode("mk30 7kq4 x9mp")).toBe("MK30-7KQ4-X9MP");
    expect(normalizePassCode("MK307KQ4X9MP")).toBe("MK30-7KQ4-X9MP");
    expect(normalizePassCode("MK30-OKQ4-X9MI")).toBe("MK30-0KQ4-X9M1");
    expect(normalizePassCode("hello")).toBeNull();
    expect(normalizePassCode("")).toBeNull();
  });
});

describe("pass tokens", () => {
  it("round-trips a genuine token", () => {
    const token = passToken("MK30-7KQ4-X9MP", secret);
    expect(token).toMatch(/^MK30-7KQ4-X9MP\.[A-Za-z0-9_-]{22}$/);
    expect(verifyPassToken(token, secret)).toBe("MK30-7KQ4-X9MP");
  });

  it("rejects altered codes, wrong secrets and malformed tokens", () => {
    const token = passToken("MK30-7KQ4-X9MP", secret);
    expect(verifyPassToken(token.replace("7KQ4", "7KQ5"), secret)).toBeNull();
    expect(verifyPassToken(token, `${secret}x`)).toBeNull();
    expect(verifyPassToken("MK30-7KQ4-X9MP", secret)).toBeNull();
    expect(verifyPassToken(`${token}x`, secret)).toBeNull();
  });
});
