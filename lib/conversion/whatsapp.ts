import { defaultWhatsappTemplate } from "@/config/experience";

export type WhatsappReference = {
  productId: string;
  productName: string;
  inquiryId: string;
};

/**
 * Fills a configured template with non-sensitive references only. Customer
 * name, phone number, PIN code, and city are never placed in the message.
 */
export function renderWhatsappMessage(
  template: string | undefined,
  reference: WhatsappReference,
): string {
  const values: Record<string, string> = {
    productId: reference.productId,
    productName: reference.productName,
    inquiryId: reference.inquiryId,
  };
  return (template || defaultWhatsappTemplate)
    .replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
    .slice(0, 800);
}

export function buildWhatsappUrl(
  number: string,
  template: string | undefined,
  reference: WhatsappReference,
): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(renderWhatsappMessage(template, reference))}`;
}
