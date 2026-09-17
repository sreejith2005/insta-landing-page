import { describe, expect, it } from "vitest";

import {
  countMatchingInquiries,
  defaultHeaders,
  headerRecord,
  productFromMap,
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

describe("Reel_Product_Map resolution", () => {
  const products = [
    {
      product_id: "MKTEST001",
      product_name: "Test Bracelet",
      reel_id: "REEL001",
      campaign_id: "TESTCAMPAIGN",
      product_position: "1",
      active_status: "TRUE",
      category: "Bracelet",
      collection: "Test Collection",
      campaign_name: "Test Campaign",
    },
  ];
  const map = [
    { reel_id: "REEL001", campaign_id: "TESTCAMPAIGN", product_position: "1", product_id: "MKTEST001", active_status: "TRUE" },
    { reel_id: "REEL002", campaign_id: "DIWALI26", product_position: "3", product_id: "MKTEST001", active_status: "TRUE" },
    { reel_id: "REEL003", campaign_id: "DIWALI26", product_position: "1", product_id: "MKTEST001", active_status: "FALSE" },
    { reel_id: "", campaign_id: "", product_position: "", product_id: "", active_status: "  " },
  ];

  it("joins the exact mapping row with the product's attribution fields", () => {
    expect(productFromMap(products, map, { productId: "MKTEST001", reelId: "REEL001", campaignId: "TESTCAMPAIGN" })).toEqual({
      productId: "MKTEST001",
      productName: "Test Bracelet",
      reelId: "REEL001",
      campaignId: "TESTCAMPAIGN",
      productPosition: 1,
      active: true,
      category: "Bracelet",
      collection: "Test Collection",
      campaignName: "Test Campaign",
    });
  });

  it("lets one product appear in several Reels with each mapping's own position", () => {
    const record = productFromMap(products, map, { productId: "MKTEST001", reelId: "REEL002", campaignId: "DIWALI26" });
    expect(record).toMatchObject({ reelId: "REEL002", campaignId: "DIWALI26", productPosition: 3, active: true });
  });

  it("does not resolve unmapped tuples, tampered products, or products missing from Products", () => {
    expect(productFromMap(products, map, { productId: "MKTEST001", reelId: "REEL001", campaignId: "DIWALI26" })).toBeNull();
    expect(productFromMap(products, map, { productId: "OTHER", reelId: "REEL001", campaignId: "TESTCAMPAIGN" })).toBeNull();
    expect(productFromMap([], map, { productId: "MKTEST001", reelId: "REEL001", campaignId: "TESTCAMPAIGN" })).toBeNull();
    expect(productFromMap(products, map, { productId: "", reelId: "", campaignId: "" })).toBeNull();
  });

  it("is inactive when either the mapping or the product is switched off", () => {
    expect(productFromMap(products, map, { productId: "MKTEST001", reelId: "REEL003", campaignId: "DIWALI26" })?.active).toBe(false);
    const inactiveProduct = [{ ...products[0], active_status: "FALSE" }];
    expect(productFromMap(inactiveProduct, map, { productId: "MKTEST001", reelId: "REEL001", campaignId: "TESTCAMPAIGN" })?.active).toBe(false);
  });

  it("documents the map tab's canonical headers", () => {
    expect(defaultHeaders.reelMap).toEqual(["reel_id", "campaign_id", "product_position", "product_id", "active_status"]);
  });
});
