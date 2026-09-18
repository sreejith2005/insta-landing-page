import { describe, expect, it } from "vitest";

import { PreviewRepository } from "@/lib/providers/preview-repository";
import type { CalendlyInviteeCreated } from "@/lib/validation/schemas";
import { bookingTypeFor, inviteePhones, recordCalendlyBooking } from "./record-calendly-booking";

const eventTypes = {
  videoCall: ["https://api.calendly.com/event_types/VIDEO"],
  storeVisit: ["https://api.calendly.com/event_types/STORE"],
};

function invitee(overrides: Partial<CalendlyInviteeCreated["payload"]> = {}): CalendlyInviteeCreated {
  return {
    event: "invitee.created",
    payload: {
      uri: "https://api.calendly.com/scheduled_events/E1/invitees/I1",
      email: "ananya@example.com",
      name: "Ananya Shah",
      text_reminder_number: "+91 98765 43210",
      questions_and_answers: [],
      scheduled_event: {
        start_time: "2026-09-20T05:30:00.000000Z",
        end_time: "2026-09-20T06:00:00.000000Z",
        event_type: "https://api.calendly.com/event_types/STORE",
      },
      ...overrides,
    },
  };
}

const lead = (mobileNumber: string, productId: string, idempotencyKey: string) => ({
  fullName: "Ananya Shah",
  mobileNumber,
  pinCode: "400001",
  city: "Mumbai",
  productId,
  reelId: "R123",
  campaignId: "RAKHI26",
  source: "instagram" as const,
  sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
  idempotencyKey,
  landingPageVersion: "phase1",
});

const product = (productId: string) => ({ productId, productName: "Internal", reelId: "R123", campaignId: "RAKHI26" });

describe("bookingTypeFor", () => {
  it("infers the booking type from the configured event type URIs", () => {
    expect(bookingTypeFor("https://api.calendly.com/event_types/VIDEO", eventTypes)).toBe("video_call");
    expect(bookingTypeFor("https://api.calendly.com/event_types/STORE", eventTypes)).toBe("store_visit");
    expect(bookingTypeFor("https://api.calendly.com/event_types/OTHER", eventTypes)).toBe("unknown");
  });
});

describe("inviteePhones", () => {
  it("collects Indian mobiles from the reminder number and booking answers", () => {
    expect(
      inviteePhones(
        invitee({
          text_reminder_number: "+91 98765 43210",
          questions_and_answers: [
            { question: "Phone", answer: "91234 56789" },
            { question: "Notes", answer: "Looking for a bracelet" },
            { question: "Again", answer: "9876543210" },
          ],
        }).payload,
      ),
    ).toEqual(["9876543210", "9123456789"]);
    expect(inviteePhones(invitee({ text_reminder_number: null, questions_and_answers: null }).payload)).toEqual([]);
  });
});

describe("recordCalendlyBooking", () => {
  it("logs the real scheduled time joined to the invitee's most recent enquiry", async () => {
    const repository = new PreviewRepository();
    await repository.acceptLead(lead("9876543210", "MKBR639", "key-000000000001"), product("MKBR639"));
    await repository.acceptLead(lead("9876543210", "RG5074", "key-000000000002"), product("RG5074"));

    expect(await recordCalendlyBooking(invitee(), repository, eventTypes)).toEqual({ wasReplay: false });
    expect(repository.snapshot().bookings).toEqual([
      {
        bookingType: "store_visit",
        scheduledStart: "2026-09-20T05:30:00.000000Z",
        scheduledEnd: "2026-09-20T06:00:00.000000Z",
        inviteeName: "Ananya Shah",
        inviteeEmail: "ananya@example.com",
        inviteeUri: "https://api.calendly.com/scheduled_events/E1/invitees/I1",
        attribution: { productId: "RG5074", reelId: "R123", campaignId: "RAKHI26" },
      },
    ]);

    // Calendly retries are idempotent.
    expect(await recordCalendlyBooking(invitee(), repository, eventTypes)).toEqual({ wasReplay: true });
    expect(repository.snapshot().bookings).toHaveLength(1);
  });

  it("still logs a booking it cannot join to an enquiry", async () => {
    const repository = new PreviewRepository();
    await recordCalendlyBooking(invitee({ text_reminder_number: null }), repository, eventTypes);
    expect(repository.snapshot().bookings[0]).toMatchObject({ attribution: null, bookingType: "store_visit" });
  });
});
