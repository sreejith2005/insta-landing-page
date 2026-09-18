import type { ServerEnv } from "@/lib/config/env";
import type { BookingType, FunnelRepository } from "@/lib/leads/contracts";
import { normalizeIndianPhone } from "@/lib/phone/normalize-indian-phone";
import type { CalendlyInviteeCreated } from "@/lib/validation/schemas";

type EventTypes = ServerEnv["calendly"]["eventTypes"];

/** Which configured Calendly event type the booking used. */
export function bookingTypeFor(eventTypeUri: string, eventTypes: EventTypes): BookingType {
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

/**
 * Logs a confirmed Calendly booking with its real scheduled time, joined to
 * the most recent enquiry from the same invitee. An unmatched booking is still
 * logged, with blank product/Reel/campaign.
 */
export async function recordCalendlyBooking(
  { payload }: CalendlyInviteeCreated,
  repository: Pick<FunnelRepository, "findLatestInquiryByContact" | "recordBooking">,
  eventTypes: EventTypes,
) {
  const attribution = await repository.findLatestInquiryByContact({
    email: payload.email,
    phones: inviteePhones(payload),
  });
  return repository.recordBooking({
    bookingType: bookingTypeFor(payload.scheduled_event.event_type, eventTypes),
    scheduledStart: payload.scheduled_event.start_time,
    scheduledEnd: payload.scheduled_event.end_time,
    inviteeName: payload.name,
    inviteeEmail: payload.email,
    inviteeUri: payload.uri,
    attribution,
  });
}
