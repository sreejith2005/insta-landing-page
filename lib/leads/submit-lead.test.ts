import { describe, expect, it, vi } from "vitest";

// Never reach the real India Post API from tests.
vi.mock("@/lib/pincode/lookup-pin-code", () => ({
  lookupPinCode: vi.fn().mockResolvedValue({ city: "Mumbai", state: "Maharashtra" }),
}));

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
  idempotencyKey: "lead:d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4:MKBR639:R123:RAKHI26",
  landingPageVersion: "phase1",
};

describe("submitLead", () => {
  it("returns identifiers only and records form and offer events after persistence", async () => {
    const repository = new PreviewRepository();
    const result = await submitLead(input, repository);

    expect(result).toMatchObject({
      ok: true,
      isRepeatCustomer: false,
    });
    expect(JSON.stringify(result)).not.toMatch(/productName|productImage|specification|price/i);
    expect(repository.snapshot().events.map((event) => event.eventName)).toEqual([
      "form_submitted",
      "offer_unlocked",
    ]);
  });

  it("reuses a customer while creating a separately attributed inquiry", async () => {
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
    expect(second.inquiryId).not.toBe(first.inquiryId);
    expect(second.isRepeatCustomer).toBe(true);

    expect(repository.snapshot().inquiries[1]).toMatchObject({
      productId: "RG5073",
      productName: "Selected Gold Ring",
      reelId: "R456",
      campaignId: "BRIDAL26",
      utmCampaign: "bridal26",
      customerId: first.customerId,
    });
    expect(repository.snapshot().events.map((event) => event.eventName)).toEqual([
      "form_submitted",
      "offer_unlocked",
      "form_submitted",
      "repeat_customer_detected",
      "offer_unlocked",
    ]);
  });

  it("replays idempotently without another inquiry or event", async () => {
    const repository = new PreviewRepository();
    const first = await submitLead(input, repository);
    const replay = await submitLead(input, repository);
    expect(replay).toEqual(first);
    expect(repository.snapshot().inquiries).toHaveLength(1);
    expect(repository.snapshot().events).toHaveLength(2);
  });

  it("derives the state from the PIN on the server, overriding the browser's value", async () => {
    const repository = new PreviewRepository();
    const lookup = vi.fn().mockResolvedValue({ city: "Mumbai", state: "Maharashtra" });
    await submitLead({ ...input, state: "Goa" }, repository, lookup);
    expect(lookup).toHaveBeenCalledWith("400001");
    expect(repository.snapshot().inquiries[0].state).toBe("Maharashtra");
  });

  it("falls back to the submitted state when the PIN directory is down", async () => {
    const repository = new PreviewRepository();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const lookup = vi.fn().mockRejectedValue(new Error("down"));
    const result = await submitLead({ ...input, state: "Maharashtra" }, repository, lookup);
    expect(result.ok).toBe(true);
    expect(repository.snapshot().inquiries[0].state).toBe("Maharashtra");
  });

  it("rejects a filled honeypot as a bot without saving anything", async () => {
    const repository = new PreviewRepository();
    const result = await submitLead({ ...input, company: "Acme" }, repository);
    expect(result).toMatchObject({ ok: false, code: "rejected" });
    expect(repository.snapshot().inquiries).toHaveLength(0);
  });

  it("rejects an implausibly fast submission", async () => {
    const repository = new PreviewRepository();
    const result = await submitLead({ ...input, elapsedMs: 40 }, repository);
    expect(result).toMatchObject({ ok: false, code: "rejected" });
    expect(repository.snapshot().inquiries).toHaveLength(0);
  });

  it("returns a safe failure without accepting a lead when persistence fails", async () => {
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
