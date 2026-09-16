import { describe, expect, it } from "vitest";

import { PreviewRepository } from "@/lib/providers/preview-repository";
import { submitLead } from "@/lib/leads/submit-lead";
import { requestCallback } from "./request-callback";

describe("requestCallback", () => {
  it("requires an accepted inquiry and is idempotent", async () => {
    const repository = new PreviewRepository();
    const lead = await submitLead(
      {
        fullName: "Ananya Shah",
        mobileNumber: "9876543210",
        pinCode: "400001",
        city: "Mumbai",
        productId: "MKBR639",
        reelId: "R123",
        campaignId: "RAKHI26",
        source: "instagram",
        sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
        idempotencyKey: "lead:d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
        landingPageVersion: "phase1",
      },
      repository,
    );
    if (!lead.ok) throw new Error("Lead setup failed");
    const input = {
      inquiryId: lead.inquiryId,
      sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
      idempotencyKey: "callback:d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
    };
    expect(await requestCallback(input, repository)).toMatchObject({ ok: true });
    expect(await requestCallback(input, repository)).toMatchObject({ ok: true });
    expect(repository.snapshot().callbacks).toHaveLength(1);
    expect(
      await requestCallback({ ...input, inquiryId: "missing" }, repository),
    ).toMatchObject({ ok: false, code: "invalid_inquiry" });
  });
});
