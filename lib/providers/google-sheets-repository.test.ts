import { describe, expect, it } from "vitest";

import { defaultHeaders, headerRecord, productFromRow } from "./google-sheets-repository";

describe("Google Sheets row mapping", () => {
  it("maps headers independently of column order", () => {
    expect(headerRecord(["product_id", "active_status", "product_name"], ["MK1", "true", "Ring"])).toEqual({
      product_id: "MK1",
      active_status: "true",
      product_name: "Ring",
    });
  });

  it("creates a flexible product record without projecting price", () => {
    const record = productFromRow({
      product_id: "MKBR639",
      product_name: "Bracelet",
      reel_id: "R123",
      campaign_id: "RAKHI26",
      active_status: "true",
      specifications_json: '[{"label":"Purity","value":"18K"}]',
      price: "999",
      image_url: "",
      image_alt: "",
      whatsapp_enabled: "true",
      callback_enabled: "true",
    });
    expect(record?.specifications).toEqual([{ label: "Purity", value: "18K" }]);
    expect(JSON.stringify(record)).not.toContain("999");
  });

  it("reads merchandising, position and channel configuration", () => {
    const record = productFromRow({
      product_id: "RG5074",
      product_name: "Solitaire Ring",
      category: "Ring",
      collection: "Bridal 2026",
      reel_id: "R456",
      campaign_id: "BRIDAL26",
      product_position: "2",
      active_status: "yes",
      specifications_json: "[]",
      calendly_store_url: "https://calendly.com/mk/store",
      calendly_video_url: "http://insecure.example/video",
      whatsapp_number: "919876543210",
      whatsapp_template: "Ref {inquiryId}",
      whatsapp_enabled: "true",
      callback_enabled: "false",
    });
    expect(record).toMatchObject({
      category: "Ring",
      collection: "Bridal 2026",
      productPosition: 2,
      active: true,
    });
    expect(record?.calendly.storeVisitUrl).toBe("https://calendly.com/mk/store");
    // Only HTTPS scheduling destinations are accepted.
    expect(record?.calendly.videoConsultationUrl).toBeUndefined();
    expect(record?.whatsapp?.number).toBe("919876543210");
    expect(record?.ctas.callbackEnabled).toBe(false);
  });

  it("rejects a malformed WhatsApp destination", () => {
    const record = productFromRow({
      product_id: "MK1",
      product_name: "Ring",
      reel_id: "R1",
      campaign_id: "C1",
      active_status: "true",
      whatsapp_number: "not-a-number",
    });
    expect(record?.whatsapp?.number).toBeUndefined();
  });

  it("documents a canonical column set for every write target", () => {
    expect(defaultHeaders.inquiries).toContain("source");
    expect(defaultHeaders.inquiries).toContain("utm_campaign");
    expect(defaultHeaders.inquiries).toContain("idempotency_key");
    expect(defaultHeaders.events).toContain("idempotency_key");
    // Phone number identifies a customer, never an inquiry.
    expect(defaultHeaders.customers).toContain("phone_normalized");
  });
});
