import type { ProductMapping, ReelMapping } from "@/types/funnel";
import type { IncomingResolution, ProductChoice, ProductRecord, ProductRepository, ProductResolution } from "./contracts";

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

/** Only HTTPS thumbnails reach the browser; anything else leaves the tile name-only. */
function httpsUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function toChoice(record: ProductRecord): ProductChoice {
  const imageUrl = httpsUrl(record.imageUrl);
  return { productId: record.productId, productName: record.productName, ...(imageUrl ? { imageUrl } : {}) };
}

/**
 * Entry point for the landing page. A link that names a product resolves
 * exactly as `resolveProductContext` always has. A Reel-level link resolves
 * through the Reel's active products: none is "missing", one resolves as if the
 * link had named it, and several ask the customer to choose. A chosen product
 * returns through the exact path, so the choice is re-verified on the server.
 */
export async function resolveIncomingContext(
  context: ReelMapping & { productId?: string },
  repository: ProductRepository,
): Promise<IncomingResolution> {
  const { productId, reelId, campaignId } = context;
  if (productId !== undefined) return resolveProductContext({ ...context, productId }, repository);

  const products = await repository.findActiveByReel({ reelId, campaignId });
  if (products.length === 0) return { status: "missing" };
  if (products.length === 1) {
    return resolveProductContext({ productId: products[0].productId, reelId, campaignId }, repository);
  }
  return { status: "choose", products: products.map(toChoice) };
}
