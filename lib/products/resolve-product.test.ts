import { describe, expect, it } from "vitest";

import type { ProductRecord, ProductRepository } from "./contracts";
import { resolveProductContext } from "./resolve-product";

const mapping: ProductRecord = {
  productId: "MK001",
  productName: "Internal reporting name",
  reelId: "R101",
  campaignId: "RAKHI26",
  productPosition: 1,
  category: "Bracelet",
  collection: "Rakhi 2026",
  campaignName: "Rakhi Offer 2026",
  active: true,
};

function repository(record: ProductRecord | null): ProductRepository {
  return { findByContext: async () => record };
}

describe("resolveProductContext", () => {
  it("threads the image and booking links through the resolved context", async () => {
    const result = await resolveProductContext(
      { productId: "MK001", reelId: "R101", campaignId: "RAKHI26" },
      repository({
        ...mapping,
        imageUrl: "https://cdn.example.com/mk001.jpg",
        calendlyStoreUrl: "https://calendly.com/mkjewels/store",
        calendlyVideoUrl: "https://calendly.com/mkjewels/video",
      }),
    );
    expect(result).toMatchObject({
      status: "resolved",
      context: {
        imageUrl: "https://cdn.example.com/mk001.jpg",
        calendlyStoreUrl: "https://calendly.com/mkjewels/store",
        calendlyVideoUrl: "https://calendly.com/mkjewels/video",
      },
    });
  });

  it("returns only the internal attribution mapping for an active exact tuple", async () => {
    const result = await resolveProductContext(
      { productId: "MK001", reelId: "R101", campaignId: "RAKHI26" },
      repository(mapping),
    );

    expect(result).toEqual({
      status: "resolved",
      context: {
        productId: "MK001",
        productName: "Internal reporting name",
        reelId: "R101",
        campaignId: "RAKHI26",
        productPosition: 1,
        category: "Bracelet",
        collection: "Rakhi 2026",
        campaignName: "Rakhi Offer 2026",
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /productImage|specifications|price|calendly|whatsapp|callback/i,
    );
  });

  it("rejects a mismatched tuple even if a repository returns a mapping", async () => {
    const result = await resolveProductContext(
      { productId: "OTHER", reelId: "R101", campaignId: "RAKHI26" },
      repository(mapping),
    );
    expect(result.status).toBe("invalid");
  });

  it("distinguishes missing and inactive mappings", async () => {
    await expect(
      resolveProductContext(
        { productId: "MISS", reelId: "R101", campaignId: "RAKHI26" },
        repository(null),
      ),
    ).resolves.toEqual({ status: "missing" });
    await expect(
      resolveProductContext(
        { productId: "MK001", reelId: "R101", campaignId: "RAKHI26" },
        repository({ ...mapping, active: false }),
      ),
    ).resolves.toEqual({ status: "inactive" });
  });
});
