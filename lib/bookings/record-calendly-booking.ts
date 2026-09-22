import type { ServerEnv } from "@/lib/config/env";
import { INQUIRY_ID_PATTERN, SCHEDULER_BOOKING_TYPES, type SchedulerBookingType } from "@/lib/contact/calendly";
import type { BookingType, FunnelRepository } from "@/lib/leads/contracts";
import { normalizeIndianPhone } from "@/lib/phone/normalize-indian-phone";
import type { CalendlyInviteeCreated } from "@/lib/validation/schemas";

type EventTypes = ServerEnv["calendly"]["eventTypes"];

/**
 * What the booking was for. The button the customer chose (sent back as
 * `utm_term`) wins, because on Calendly's free plan both buttons share one
 * event type; otherwise it is decided by which configured event type was used.
 */
export function bookingTypeFor(
  eventTypeUri: string,
  eventTypes: EventTypes,
  tracked?: SchedulerBookingType,
): BookingType {
  if (tracked) return tracked;
  if (eventTypes.videoCall.includes(eventTypeUri)) return "video_call";
  if (eventTypes.storeVisit.includes(eventTypeUri)) return "store_visit";
  return "unknown";
}

/**
 * Indian mobile numbers the invitee gave Calendly: the SMS reminder number and
 * any booking-question answer that is a phone number. Calendly knows nothing of
 * the product context, so these are the join key back to the enquiry.
 */
export function inviteePhones(payload: CalendlyInviteeCreated["payload"]): string[] {
  const candidates = [
    payload.text_reminder_number ?? "",
    ...(payload.questions_and_answers ?? []).map((item) => item.answer),
  ];
  const phones = new Set<string>();
  for (const candidate of candidates) {
    try {
      phones.add(normalizeIndianPhone(candidate));
    } catch {
      // Not a phone number.
    }
  }
  return [...phones];
}

/** The inquiry ID the funnel's embed put in `utm_content`, if it looks like one. */
export function trackedInquiryId(payload: CalendlyInviteeCreated["payload"]) {
  const value = payload.tracking?.utm_content?.trim();
  return value && INQUIRY_ID_PATTERN.test(value) ? value : undefined;
}

/** The booking choice the funnel's embed put in `utm_term`, if it is one. */
export function trackedBookingType(payload: CalendlyInviteeCreated["payload"]) {
  const value = payload.tracking?.utm_term?.trim();
  return SCHEDULER_BOOKING_TYPES.find((type) => type === value);
}

/**
 * Logs a confirmed Calendly booking with its real scheduled time, joined to
 * its enquiry: by the inquiry ID the embed passed as `utm_content`, or, for a
 * booking made outside the funnel (or an ID that matches no inquiry), the
 * invitee's most recent enquiry by phone. An unmatched booking is still
 * logged, with blank product/Reel/campaign and reference number.
 */
export async function recordCalendlyBooking(
  { payload }: CalendlyInviteeCreated,
  repository: Pick<FunnelRepository, "findInquiryById" | "findLatestInquiryByContact" | "recordBooking">,
  eventTypes: EventTypes,
) {
  const inquiryId = trackedInquiryId(payload);
  const attribution =
    (inquiryId ? await repository.findInquiryById(inquiryId) : null) ??
    (await repository.findLatestInquiryByContact({ email: payload.email, phones: inviteePhones(payload) }));
  return repository.recordBooking({
    bookingType: bookingTypeFor(payload.scheduled_event.event_type, eventTypes, trackedBookingType(payload)),
    scheduledStart: payload.scheduled_event.start_time,
    scheduledEnd: payload.scheduled_event.end_time,
    inviteeName: payload.name,
    inviteeEmail: payload.email,
    inviteeUri: payload.uri,
    attribution,
  });
}
