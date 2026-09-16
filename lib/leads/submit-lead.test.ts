import { describe, expect, it } from "vitest";

import { PreviewRepository } from "@/lib/providers/preview-repository";
import type { LeadSubmissionInput } from "@/lib/validation/schemas";
import { submitLead } from "./submit-lead";

const input: LeadSubmissionInput = {
  fullName: "Ananya Shah",
  mobileNumber: "9876543210",
  pinCode: "400001",
  city: "Mumbai",
  productId: "MKBR639",
  reelId: "R123",
  campaignId: "RAKHI26",
  source: "instagram",
  sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
  idempotencyKey: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4:MKBR639:001",
  landingPageVersion: "phase1",
};

describe("submitLead", () => {
  it("creates one customer and distinct inquiries for repeat interest", async () => {
    const repository = new PreviewRepository();
    const first = await submitLead(input, repository);
    const second = await submitLead(
      { ...input, idempotencyKey: `${input.idempotencyKey}:2` },
      repository,
    );
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.customerId).toBe(first.customerId);
      expect(second.inquiryId).not.toBe(first.inquiryId);
      expect(second.isRepeatCustomer).toBe(true);
    }
    expect(repository.snapshot().events.map((event) => event.eventName)).toEqual([
      "form_submitted",
      "form_submitted",
      "repeat_customer_detected",
    ]);
  });

  it("keeps the new product, Reel and campaign when a known phone returns", async () => {
    const repository = new PreviewRepository();
    const first = await submitLead(input, repository);
    const second = await submitLead(
      {
        ...input,
        productId: "RG5073",
        reelId: "R456",
        campaignId: "BRIDAL26",
        utmSource: "instagram",
        utmCampaign: "bridal26",
        idempotencyKey: `${input.idempotencyKey}:rg`,
      },
      repository,
    );
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(second.customerId).toBe(first.customerId);
    expect(second.isRepeatCustomer).toBe(true);
    expect(second.product.productId).toBe("RG5073");

    const { inquiries } = repository.snapshot();
    expect(inquiries).toHaveLength(2);
    expect(inquiries[1]).toMatchObject({
      productId: "RG5073",
      reelId: "R456",
      campaignId: "BRIDAL26",
      utmCampaign: "bridal26",
      customerId: first.customerId,
    });
  });

  it("applies experience defaults without overriding product configuration", async () => {
    const repository = new PreviewRepository();
    const result = await submitLead(input, repository, {
      defaults: {
        calendly: { storeVisitUrl: "https://calendly.com/mk/store" },
        whatsapp: { number: "919999999999" },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.product.calendly.storeVisitUrl).toBe("https://calendly.com/mk/store");
      expect(result.product.whatsapp.number).toBe("919999999999");
    }
  });

  it("replays an idempotent submission without a second inquiry", async () => {
    const repository = new PreviewRepository();
    const first = await submitLead(input, repository);
    const replay = await submitLead(input, repository);
    expect(replay).toEqual(first);
    expect(repository.snapshot().events).toHaveLength(1);
  });

  it("rejects a submission completed faster than a human can type", async () => {
    const repository = new PreviewRepository();
    const result = await submitLead({ ...input, elapsedMs: 40 }, repository);
    expect(result).toMatchObject({ ok: false, code: "rejected" });
    expect(repository.snapshot().inquiries).toHaveLength(0);
  });

  it("withholds the reveal when persistence fails", async () => {
    const repository = new PreviewRepository({ failWrites: true });
    const result = await submitLead(input, repository);
    expect(result).toEqual({
      ok: false,
      code: "service_unavailable",
      message: "We could not save your details. Please try again.",
    });
    expect(JSON.stringify(result)).not.toContain(input.mobileNumber);
  });
});
