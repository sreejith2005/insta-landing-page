import { resolveProductContext } from "@/lib/products/resolve-product";
import type { LeadSubmissionInput } from "@/lib/validation/schemas";
import type { FunnelRepository, SubmitLeadResult } from "./contracts";

const MINIMUM_ELAPSED_MS = 150;

export async function submitLead(
  input: LeadSubmissionInput,
  repository: FunnelRepository,
): Promise<SubmitLeadResult> {
  if (input.elapsedMs !== undefined && input.elapsedMs < MINIMUM_ELAPSED_MS) {
    return { ok: false, code: "rejected", message: "We could not verify this submission." };
  }

  const resolved = await resolveProductContext(
    { productId: input.productId, reelId: input.reelId, campaignId: input.campaignId },
    repository,
  );
  if (resolved.status === "inactive") {
    return { ok: false, code: "inactive_product", message: "This enquiry is unavailable." };
  }
  if (resolved.status !== "resolved") {
    return { ok: false, code: "invalid_product", message: "We could not verify this enquiry." };
  }

  try {
    const accepted = await repository.acceptLead(input, resolved.context.productName);
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
        await repository.recordEvent({ eventName: "offer_unlocked", ...eventBase });
      } catch {
        console.error("Funnel event write failed", { inquiryId: accepted.inquiryId });
      }
    }
    return {
      ok: true,
      inquiryId: accepted.inquiryId,
      customerId: accepted.customerId,
      isRepeatCustomer: accepted.isRepeatCustomer,
    };
  } catch {
    return {
      ok: false,
      code: "service_unavailable",
      message: "We could not save your details. Please try again.",
    };
  }
}
