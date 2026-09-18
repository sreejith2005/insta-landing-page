import { whatsappMessageTemplate } from "@/config/experience";
import type { ResolvedAttributionContext } from "@/types/funnel";

/**
 * wa.me deep link to the CRM number with the product pre-filled. Built on the
 * server so the product name only ever leaves it inside this href. Undefined
 * (button hidden) when no CRM number is configured.
 */
export function whatsappContactUrl(
  number: string | undefined,
  product: Pick<ResolvedAttributionContext, "productName" | "productId">,
  template: string = whatsappMessageTemplate,
) {
  if (!number) return undefined;
  const text = template
    .replaceAll("{productName}", product.productName)
    .replaceAll("{productId}", product.productId);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
