import { logEvent } from "@/lib/log";
import { generatePassCode } from "@/lib/passes/code";
import { issuedPass, type PassSettings } from "@/lib/passes/issue";
import { lookupPinCode, type PinCodeLookup } from "@/lib/pincode/lookup-pin-code";
import { resolveProductContext } from "@/lib/products/resolve-product";
import type { LeadSubmissionInput } from "@/lib/validation/schemas";
import type { FunnelRepository, SubmitLeadResult } from "./contracts";

const MINIMUM_ELAPSED_MS = 150;

/**
 * The state is derived from the PIN on the server, never taken on the
 * browser's word. The client's autofilled value is only a fallback for when
 * the PIN directory cannot be reached.
 */
async function resolveState(input: LeadSubmissionInput, lookup: PinCodeLookup) {
  try {
    const location = await lookup(input.pinCode);
    return location?.state ?? input.state;
  } catch {
    console.error("PIN code state lookup failed; using the submitted state.");
    return input.state;
  }
}

export async function submitLead(
  input: LeadSubmissionInput,
  repository: FunnelRepository,
  pinCodeLookup: PinCodeLookup = lookupPinCode,
  /** Store pass settings; without them no pass is issued. */
  passes?: PassSettings,
): Promise<SubmitLeadResult> {
  if (input.company?.trim() || (input.elapsedMs !== undefined && input.elapsedMs < MINIMUM_ELAPSED_MS)) {
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

  const lead = { ...input, state: await resolveState(input, pinCodeLookup) };

  try {
    // Every enquiry gets its own code, so a store visit traces back to its exact Reel.
    const accepted = await repository.acceptLead(lead, resolved.context, {
      passCode: passes ? generatePassCode(passes.codePrefix) : undefined,
    });
    logEvent("lead.accepted", {
      inquiryId: accepted.inquiryId,
      wasReplay: accepted.wasReplay,
      passCode: accepted.passCode,
      productId: input.productId,
      reelId: input.reelId,
      campaignId: input.campaignId,
    });
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
        if (accepted.passCode) {
          await repository.recordEvent({ eventName: "pass_issued", ...eventBase, metadata: { passCode: accepted.passCode } });
        }
      } catch {
        console.error("Funnel event write failed", { inquiryId: accepted.inquiryId });
      }
    }
    return {
      ok: true,
      inquiryId: accepted.inquiryId,
      customerId: accepted.customerId,
      isRepeatCustomer: accepted.isRepeatCustomer,
      pass: passes && accepted.passCode ? issuedPass(accepted.passCode, accepted.createdAt, passes) : undefined,
    };
  } catch {
    return {
      ok: false,
      code: "service_unavailable",
      message: "We could not save your details. Please try again.",
    };
  }
}
