import { describe, expect, it } from "vitest";

import {
  countMatchingInquiries,
  defaultHeaders,
  headerRecord,
  productFromRow,
} from "./google-sheets-repository";

describe("Google Sheets flat Product_Master mapping", () => {
  it("maps headers independently of column order", () => {
    expect(
      headerRecord(
        ["campaign_id", "product_id", "active_status"],
        ["RAKHI26", "MK001", "true"],
      ),
    ).toEqual({ campaign_id: "RAKHI26", product_id: "MK001", active_status: "true" });
  });

  it("parses one authoritative attribution tuple without catalogue fields", () => {
    const record = productFromRow({
      product_id: "MK001",
      product_name: "Internal reporting name",
      reel_id: "R101",
      campaign_id: "RAKHI26",
      product_position: "2",
      active_status: "TRUE",
      category: "Bracelet",
      collection: "Rakhi 2026",
      campaign_name: "Rakhi Offer",
      image_url: "https://example.test/should-not-be-read.jpg",
      specifications_json: '[{"label":"Purity","value":"18K"}]',
      price: "999",
    });

    expect(record).toEqual({
      productId: "MK001",
      productName: "Internal reporting name",
      reelId: "R101",
      campaignId: "RAKHI26",
      productPosition: 2,
      active: true,
      category: "Bracelet",
      collection: "Rakhi 2026",
      campaignName: "Rakhi Offer",
    });
    expect(JSON.stringify(record)).not.toMatch(/image|specification|price|999/i);
  });

  it("rejects rows missing any member of the authoritative tuple", () => {
    expect(
      productFromRow({
        product_id: "MK001",
        product_name: "Name",
        reel_id: "R101",
        campaign_id: "",
        active_status: "TRUE",
      }),
    ).toBeNull();
  });

  it("documents only the flat mapping and active operational write columns", () => {
    expect(defaultHeaders.products).toEqual([
      "product_id",
      "product_name",
      "reel_id",
      "campaign_id",
      "product_position",
      "active_status",
      "category",
      "collection",
      "campaign_name",
    ]);
    expect(defaultHeaders.inquiries).toContain("product_name");
    expect(defaultHeaders.inquiries).toContain("idempotency_key");
    expect(defaultHeaders.customers).toContain("phone_normalized");
    expect(defaultHeaders).not.toHaveProperty("reelProductMap");
    expect(defaultHeaders).not.toHaveProperty("callbacks");
  });
});

describe("countMatchingInquiries", () => {
  const rows = [
    {
      product_id: "MK001",
      reel_id: "R101",
      campaign_id: "RAKHI26",
      created_at: "2026-09-01T00:00:00.000Z",
    },
    {
      product_id: "MK001",
      reel_id: "R102",
      campaign_id: "RAKHI26",
      created_at: "2026-09-10T00:00:00.000Z",
    },
    {
      product_id: "MK001",
      reel_id: "R101",
      campaign_id: "BRIDAL26",
      created_at: "not-a-date",
    },
    {
      product_id: "MK002",
      reel_id: "R101",
      campaign_id: "RAKHI26",
      created_at: "2026-09-12T00:00:00.000Z",
    },
  ];

  it("counts product-only, campaign, exact tuple, and recent-window matches", () => {
    expect(countMatchingInquiries(rows, { productId: "MK001" })).toBe(3);
    expect(
      countMatchingInquiries(rows, { productId: "MK001", campaignId: "RAKHI26" }),
    ).toBe(2);
    expect(
      countMatchingInquiries(rows, {
        productId: "MK001",
        reelId: "R101",
        campaignId: "RAKHI26",
      }),
    ).toBe(1);
    expect(
      countMatchingInquiries(rows, {
        productId: "MK001",
        campaignId: "RAKHI26",
        since: "2026-09-05T00:00:00.000Z",
      }),
    ).toBe(1);
  });

  it("does not include malformed dates in a windowed count", () => {
    expect(
      countMatchingInquiries(rows, {
        productId: "MK001",
        campaignId: "BRIDAL26",
        since: "2026-09-01T00:00:00.000Z",
      }),
    ).toBe(0);
  });
});
