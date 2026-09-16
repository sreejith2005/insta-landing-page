import { describe, expect, it } from "vitest";

import { submitLead } from "@/lib/leads/submit-lead";
import { PreviewRepository } from "@/lib/providers/preview-repository";
import type { AppointmentInput } from "@/lib/validation/schemas";
import { recordBooking } from "./record-booking";

const sessionId = "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4";

async function acceptedInquiry(repository: PreviewRepository) {
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
      sessionId,
      idempotencyKey: `lead:${sessionId}:MKBR639`,
      landingPageVersion: "phase1",
    },
    repository,
  );
  if (!lead.ok) throw new Error("Lead setup failed");
  return lead;
}

describe("recordBooking", () => {
  it("links a booking to the inquiry and ignores a retried callback", async () => {
    const repository = new PreviewRepository();
    const lead = await acceptedInquiry(repository);
    const input: AppointmentInput = {
      inquiryId: lead.inquiryId,
      customerId: lead.customerId,
      sessionId,
      productId: "MKBR639",
      reelId: "R123",
      campaignId: "RAKHI26",
      source: "instagram",
      landingPageVersion: "phase1",
      appointmentType: "store_visit",
      eventUri: "https://api.calendly.com/scheduled_events/abc",
      inviteeUri: "https://api.calendly.com/scheduled_events/abc/invitees/def",
      idempotencyKey: `apt:${sessionId}:store_visit`,
    };

    const first = await recordBooking(input, repository);
    const replay = await recordBooking(input, repository);
    expect(first).toMatchObject({ ok: true, inquiryId: lead.inquiryId });
    expect(replay).toEqual(first);
    expect(repository.snapshot().appointments).toHaveLength(1);
    expect(repository.snapshot().appointments[0]?.appointmentType).toBe("store_visit");
  });

  it("refuses a booking that does not belong to an accepted inquiry", async () => {
    const repository = new PreviewRepository();
    await acceptedInquiry(repository);
    const result = await recordBooking(
      {
        inquiryId: "inq_unknown",
        sessionId,
        productId: "MKBR639",
        reelId: "R123",
        campaignId: "RAKHI26",
        source: "instagram",
        landingPageVersion: "phase1",
        appointmentType: "video_consultation",
        idempotencyKey: `apt:${sessionId}:video_consultation`,
      },
      repository,
    );
    expect(result).toMatchObject({ ok: false, code: "invalid_inquiry" });
  });
});
