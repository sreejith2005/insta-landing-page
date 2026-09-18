import type { ProductMapping } from "@/types/funnel";
import type { ProductRepository, ProductResolution } from "./contracts";

/**
 * Resolves the incoming mapping against the Product Master. The URL is never
 * trusted: the record must match the exact product/Reel/campaign triple and be
 * active before any product data is returned.
 */
export async function resolveProductContext(
  context: ProductMapping,
  repository: ProductRepository,
): Promise<ProductResolution> {
  const record = await repository.findByContext(context);
  if (!record) return { status: "missing" };
  if (
    record.productId !== context.productId ||
    record.reelId !== context.reelId ||
    record.campaignId !== context.campaignId
  ) {
    return { status: "invalid" };
  }
  if (!record.active) return { status: "inactive" };

  return {
    status: "resolved",
    context: {
      productId: record.productId,
      productName: record.productName,
      reelId: record.reelId,
      campaignId: record.campaignId,
      productPosition: record.productPosition,
      category: record.category,
      collection: record.collection,
      campaignName: record.campaignName,
      imageUrl: record.imageUrl,
      calendlyStoreUrl: record.calendlyStoreUrl,
      calendlyVideoUrl: record.calendlyVideoUrl,
    },
  };
}
