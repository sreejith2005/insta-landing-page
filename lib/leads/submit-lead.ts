import type { FunnelRepository, SubmitLeadResult } from "./contracts";
import { resolveProductContext } from "@/lib/products/resolve-product";
import type { LeadSubmissionInput } from "@/lib/validation/schemas";

export async function submitLead(
  input: LeadSubmissionInput,
  repository: FunnelRepository,
): Promise<SubmitLeadResult> {
  const resolved = await resolveProductContext(
    { productId: input.productId, reelId: input.reelId, campaignId: input.campaignId },
    repository,
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
        landingPageVersion: input.landingPageVersion,
      };
      try {
        await repository.recordEvent({ eventName: "form_submitted", ...eventBase });
        if (accepted.isRepeatCustomer) await repository.recordEvent({ eventName: "repeat_customer_detected", ...eventBase });
      } catch {
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
