import { describe, expect, it } from "vitest";

import type { ProductRecord, ProductRepository } from "./contracts";
import { resolveProductContext } from "./resolve-product";

const product: ProductRecord = {
  productId: "MKBR639",
  productName: "Gold Open-Back Diamond Accented Bracelet",
  reelId: "R123",
  campaignId: "RAKHI26",
  active: true,
  productImage: null,
  specifications: [{ label: "Purity", value: "18K" }],
  offerCopy: "30% off making charges",
  calendly: {},
  ctas: { whatsappEnabled: true, callbackEnabled: true },
  internalPrice: "301032",
};

function repository(record: ProductRecord | null): ProductRepository {
  return { findByContext: async () => record };
}

describe("resolveProductContext", () => {
  it("returns a safe active product and omits internal price", async () => {
    const result = await resolveProductContext(
      { productId: "MKBR639", reelId: "R123", campaignId: "RAKHI26" },
      repository(product),
    );
    expect(result.status).toBe("resolved");
    expect(JSON.stringify(result)).not.toContain("301032");
  });

  it("rejects a mismatched mapping even if a repository returns a record", async () => {
    const result = await resolveProductContext(
      { productId: "OTHER", reelId: "R123", campaignId: "RAKHI26" },
      repository(product),
    );
    expect(result.status).toBe("invalid");
  });

  it("distinguishes missing and inactive products", async () => {
    await expect(
      resolveProductContext(
        { productId: "MISS", reelId: "R123", campaignId: "RAKHI26" },
        repository(null),
      ),
    ).resolves.toMatchObject({ status: "missing" });
    await expect(
      resolveProductContext(
        { productId: "MKBR639", reelId: "R123", campaignId: "RAKHI26" },
        repository({ ...product, active: false }),
      ),
    ).resolves.toMatchObject({ status: "inactive" });
  });
});
