import { describe, expect, it, vi } from "vitest";

import type { ProductRecord, ProductRepository } from "./contracts";
import { resolveIncomingContext, resolveProductContext } from "./resolve-product";

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
  return { findByContext: async () => record, findActiveByReel: async () => [] };
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

describe("resolveIncomingContext", () => {
  const reel = { reelId: "R456", campaignId: "BRIDAL26" };
  const ring = (productId: string, extra: Partial<ProductRecord> = {}): ProductRecord => ({
    ...mapping,
    ...reel,
    productId,
    productName: `Ring ${productId}`,
    ...extra,
  });

  /** A catalogue-backed fake: exact lookups and Reel lookups read the same records. */
  function catalogue(records: ProductRecord[]) {
    return {
      findByContext: vi.fn(async (context: { productId: string; reelId: string; campaignId: string }) =>
        records.find(
          (record) =>
            record.productId === context.productId &&
            record.reelId === context.reelId &&
            record.campaignId === context.campaignId,
        ) ?? null,
      ),
      findActiveByReel: vi.fn(async (context: { reelId: string; campaignId: string }) =>
        records.filter(
          (record) => record.active && record.reelId === context.reelId && record.campaignId === context.campaignId,
        ),
      ),
    } satisfies ProductRepository;
  }

  it("resolves a link that names a product exactly as before, never consulting the Reel", async () => {
    const records = [ring("RG1"), ring("RG2"), ring("RG3", { active: false })];
    const cases = [
      { productId: "RG1", ...reel }, // resolved
      { productId: "RG3", ...reel }, // inactive
      { productId: "NOPE", ...reel }, // missing
      { productId: "RG1", reelId: "R456", campaignId: "OTHER" }, // missing
    ];
    for (const context of cases) {
      const repo = catalogue(records);
      const expected = await resolveProductContext(context, catalogue(records));
      await expect(resolveIncomingContext(context, repo)).resolves.toEqual(expected);
      expect(repo.findActiveByReel).not.toHaveBeenCalled();
      expect(repo.findByContext).toHaveBeenCalledTimes(1);
      expect(repo.findByContext).toHaveBeenCalledWith(context);
    }
  });

  it("keeps an invalid tuple invalid when a product is named", async () => {
    const repo = { findByContext: async () => mapping, findActiveByReel: vi.fn(async () => [mapping]) };
    await expect(resolveIncomingContext({ productId: "OTHER", reelId: "R101", campaignId: "RAKHI26" }, repo)).resolves.toEqual({
      status: "invalid",
    });
    expect(repo.findActiveByReel).not.toHaveBeenCalled();
  });

  it("is missing when the Reel has no active product", async () => {
    await expect(resolveIncomingContext(reel, catalogue([]))).resolves.toEqual({ status: "missing" });
    await expect(resolveIncomingContext(reel, catalogue([ring("RG1", { active: false })]))).resolves.toEqual({
      status: "missing",
    });
  });

  it("resolves a single active product directly, identical to a link naming it", async () => {
    const records = [ring("RG1", { imageUrl: "https://cdn.example.com/rg1.jpg" }), ring("RG2", { active: false })];
    const direct = await resolveProductContext({ productId: "RG1", ...reel }, catalogue(records));
    expect(direct.status).toBe("resolved");
    await expect(resolveIncomingContext(reel, catalogue(records))).resolves.toEqual(direct);
  });

  it("asks the customer to choose between several active products, exposing only name and HTTPS image", async () => {
    const records = [
      ring("RG1", { imageUrl: "https://cdn.example.com/rg1.jpg", calendlyStoreUrl: "https://calendly.com/x" }),
      ring("RG2", { imageUrl: "http://cdn.example.com/rg2.jpg" }),
      ring("RG3", { imageUrl: "javascript:alert(1)" }),
      ring("RG4", { active: false }),
    ];
    const repo = catalogue(records);
    await expect(resolveIncomingContext(reel, repo)).resolves.toEqual({
      status: "choose",
      products: [
        { productId: "RG1", productName: "Ring RG1", imageUrl: "https://cdn.example.com/rg1.jpg" },
        { productId: "RG2", productName: "Ring RG2" },
        { productId: "RG3", productName: "Ring RG3" },
      ],
    });
    expect(repo.findByContext).not.toHaveBeenCalled();
  });
});
