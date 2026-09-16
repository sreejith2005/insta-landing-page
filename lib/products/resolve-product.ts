import type { ProductMapping, PublicProductContext } from "@/types/funnel";
import type {
  ExperienceDefaults,
  ProductRepository,
  ProductResolution,
} from "./contracts";

const defaultOrder: PublicProductContext["ctas"]["order"] = [
  "store_visit",
  "video_consultation",
  "whatsapp",
  "callback",
];

/**
 * Resolves the incoming mapping against the Product Master. The URL is never
 * trusted: the record must match the exact product/Reel/campaign triple and be
 * active before any product data is returned.
 */
export async function resolveProductContext(
  context: ProductMapping,
  repository: ProductRepository,
  defaults?: ExperienceDefaults,
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
      category: record.category,
      collection: record.collection,
      productPosition: record.productPosition,
      productImage: record.productImage,
      specifications: record.specifications,
      campaign: {
        campaignId: record.campaignId,
        offerCopy: record.offerCopy,
        offerExpiresAt: record.offerExpiresAt,
      },
      calendly: {
        storeVisitUrl: record.calendly.storeVisitUrl ?? defaults?.calendly.storeVisitUrl,
        videoConsultationUrl:
          record.calendly.videoConsultationUrl ?? defaults?.calendly.videoConsultationUrl,
      },
      whatsapp: {
        number: record.whatsapp?.number ?? defaults?.whatsapp.number,
        messageTemplate: record.whatsapp?.messageTemplate ?? defaults?.whatsapp.messageTemplate,
      },
      ctas: {
        whatsappEnabled: record.ctas.whatsappEnabled,
        callbackEnabled: record.ctas.callbackEnabled,
        order: record.ctas.order ?? defaultOrder,
      },
    },
  };
}
