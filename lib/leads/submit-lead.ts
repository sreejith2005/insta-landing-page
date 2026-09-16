import type { FunnelRepository, SubmitLeadOptions, SubmitLeadResult } from "./contracts";
import { resolveProductContext } from "@/lib/products/resolve-product";
import type { LeadSubmissionInput } from "@/lib/validation/schemas";

/**
 * Filters naive scripted posts only. The floor is deliberately low: a customer
 * using browser autofill can legitimately submit in a few hundred milliseconds,
 * and a determined bot can simply omit this optional field. The honeypot (schema
 * enforced) and the endpoint rate limit are the real protections.
 */
const MINIMUM_ELAPSED_MS = 150;

export async function submitLead(
  input: LeadSubmissionInput,
  repository: FunnelRepository,
  options: SubmitLeadOptions = {},
): Promise<SubmitLeadResult> {
  if (input.elapsedMs !== undefined && input.elapsedMs < MINIMUM_ELAPSED_MS) {
    return { ok: false, code: "rejected", message: "We could not verify this submission." };
  }

  const resolved = await resolveProductContext(
    { productId: input.productId, reelId: input.reelId, campaignId: input.campaignId },
    repository,
    options.defaults,
  );
  if (resolved.status === "inactive") {
    return { ok: false, code: "inactive_product", message: "This piece is currently unavailable." };
  }
  if (resolved.status !== "resolved") {
    return { ok: false, code: "invalid_product", message: "We could not verify this selection." };
  }

  try {
    const accepted = await repository.acceptLead(input);
    if (!accepted.wasReplay) {
      const eventBase = {
        sessionId: input.sessionId,
        inquiryId: accepted.inquiryId,
        customerId: accepted.customerId,
        productId: input.productId,
        reelId: input.reelId,
        campaignId: input.campaignId,
        source: input.source,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        utmContent: input.utmContent,
        utmTerm: input.utmTerm,
        landingPageVersion: input.landingPageVersion,
      };
      try {
        await repository.recordEvent({ eventName: "form_submitted", ...eventBase });
        if (accepted.isRepeatCustomer) {
          await repository.recordEvent({ eventName: "repeat_customer_detected", ...eventBase });
        }
      } catch {
        // Analytics must never fail an accepted lead.
        console.error("Funnel event write failed", { inquiryId: accepted.inquiryId });
      }
    }
    return {
      ok: true,
      inquiryId: accepted.inquiryId,
      customerId: accepted.customerId,
      isRepeatCustomer: accepted.isRepeatCustomer,
      product: resolved.product,
    };
  } catch {
    return {
      ok: false,
      code: "service_unavailable",
      message: "We could not save your details. Please try again.",
    };
  }
}
