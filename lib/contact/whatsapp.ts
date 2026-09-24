import { whatsappMessageTemplate } from "@/config/experience";
import { passConfig } from "@/config/pass";
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

/**
 * Adds the customer's store pass code to the pre-filled WhatsApp message, so
 * the CRM team can match an online customer to their enquiry from the chat.
 * Runs in the browser, after the enquiry is accepted and the code is known.
 */
export function withPassCode(
  url: string | undefined,
  passCode: string | undefined,
  suffix: string = passConfig.whatsappSuffix,
) {
  if (!url || !passCode) return url;
  const link = new URL(url);
  link.searchParams.set("text", `${link.searchParams.get("text") ?? ""}${suffix.replaceAll("{passCode}", passCode)}`);
  return link.toString();
}
