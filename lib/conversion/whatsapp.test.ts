import { describe, expect, it } from "vitest";

import { buildWhatsappUrl, renderWhatsappMessage } from "./whatsapp";

const reference = {
  productId: "MKBR639",
  productName: "Gold Open-Back Diamond Accented Bracelet",
  inquiryId: "inq_123",
};

describe("renderWhatsappMessage", () => {
  it("fills a configured template with product and enquiry references", () => {
    expect(renderWhatsappMessage("Ref {productId} / {inquiryId}", reference)).toBe(
      "Ref MKBR639 / inq_123",
    );
  });

  it("falls back to the approved default wording", () => {
    const message = renderWhatsappMessage(undefined, reference);
    expect(message).toContain("MKBR639");
    expect(message).toContain("inq_123");
  });

  it("never exposes lead PII through the template", () => {
    const message = renderWhatsappMessage("{fullName} {mobileNumber} {pinCode}", reference);
    expect(message).toBe("{fullName} {mobileNumber} {pinCode}");
  });

  it("builds an encoded wa.me destination", () => {
    const url = buildWhatsappUrl("919876543210", "Ref {inquiryId}", reference);
    expect(url).toBe("https://wa.me/919876543210?text=Ref%20inq_123");
  });
});
