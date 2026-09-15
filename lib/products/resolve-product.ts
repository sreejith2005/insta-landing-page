import type { IncomingInstagramContext, PublicProductContext } from "@/types/funnel";
import type { ProductRepository, ProductResolution } from "./contracts";

const defaultOrder: PublicProductContext["ctas"]["order"] = [
  "store_visit",
  "video_consultation",
  "whatsapp",
  "callback",
];

export async function resolveProductContext(
  context: IncomingInstagramContext,
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
    product: {
      productId: record.productId,
      productName: record.productName,
      productImage: record.productImage,
      specifications: record.specifications,
      campaign: {
        campaignId: record.campaignId,
        offerCopy: record.offerCopy,
        offerExpiresAt: record.offerExpiresAt,
      },
      calendly: record.calendly,
      ctas: {
        whatsappEnabled: record.ctas.whatsappEnabled,
        callbackEnabled: record.ctas.callbackEnabled,
        order: record.ctas.order ?? defaultOrder,
      },
    },
  };
}
