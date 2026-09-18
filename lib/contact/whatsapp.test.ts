import { describe, expect, it } from "vitest";

import { whatsappContactUrl } from "./whatsapp";

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
