import { describe, expect, it } from "vitest";

import { normalizeIndianPhone } from "./normalize-indian-phone";

describe("normalizeIndianPhone", () => {
  it.each([
    ["98765 43210", "9876543210"],
    ["+91 98765-43210", "9876543210"],
    ["919876543210", "9876543210"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it.each(["1234567890", "98765", "9999999999", "+44 9876543210"])(
    "rejects %s",
    (input) => expect(() => normalizeIndianPhone(input)).toThrow(/mobile number/i),
  );
});
