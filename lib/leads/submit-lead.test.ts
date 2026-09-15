import { describe, expect, it } from "vitest";

import { PreviewRepository } from "@/lib/providers/preview-repository";
import { submitLead } from "./submit-lead";

const input = {
  fullName: "Ananya Shah",
  mobileNumber: "9876543210",
  pinCode: "400001",
  city: "Mumbai",
  productId: "MKBR639",
  reelId: "R123",
  campaignId: "RAKHI26",
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

  it("replays an idempotent submission without a second inquiry", async () => {
    const repository = new PreviewRepository();
    const first = await submitLead(input, repository);
    const replay = await submitLead(input, repository);
    expect(replay).toEqual(first);
    expect(repository.snapshot().events).toHaveLength(1);
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
