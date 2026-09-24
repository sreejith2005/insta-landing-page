import { describe, expect, it } from "vitest";

import { whatsappContactUrl, withPassCode } from "./whatsapp";

describe("whatsappContactUrl", () => {
  it("builds a wa.me link with the product name and id pre-filled", () => {
    const url = whatsappContactUrl("919876543210", { productName: "Rose Gold Bracelet & Charm", productId: "MKBR639" });
    expect(url).toBe(
      `https://wa.me/919876543210?text=${encodeURIComponent("Hi, I'm interested in Rose Gold Bracelet & Charm (MKBR639)")}`,
    );
    expect(new URL(url!).searchParams.get("text")).toBe("Hi, I'm interested in Rose Gold Bracelet & Charm (MKBR639)");
  });

  it("is hidden without a CRM number", () => {
    expect(whatsappContactUrl(undefined, { productName: "Ring", productId: "MK1" })).toBeUndefined();
  });
});

describe("withPassCode", () => {
  it("adds the pass code to the pre-filled message", () => {
    const url = withPassCode("https://wa.me/919876543210?text=Hi%2C%20I'm%20interested", "MK30-7KQ4-X9MP");
    expect(new URL(url!).searchParams.get("text")).toBe("Hi, I'm interested. My MK Jewels code is MK30-7KQ4-X9MP.");
  });

  it("leaves the link alone without a code or a link", () => {
    expect(withPassCode("https://wa.me/919876543210?text=Hi", undefined)).toBe("https://wa.me/919876543210?text=Hi");
    expect(withPassCode(undefined, "MK30-7KQ4-X9MP")).toBeUndefined();
  });
});
