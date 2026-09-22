/** Calendly's official embed script. Allowed in next.config.ts script-src. */
export const CALENDLY_WIDGET_SRC = "https://assets.calendly.com/assets/external/widget.js";
/** Origin of the scheduler iframe and of its postMessage events. Allowed in frame-src. */
export const CALENDLY_ORIGIN = "https://calendly.com";

/**
 * Sheet-supplied booking links become embeds, so only plain https calendly.com
 * scheduling links survive; anything else could not load under the page's CSP.
 */
export function calendlyUrl(value: string | undefined) {
  return value && /^https:\/\/calendly\.com\/[^\s"'<>]+$/.test(value) ? value : undefined;
}

/**
 * Calendly's UTM parameter that carries the enquiry into the booking. Calendly
 * copies `utm_*` query parameters on a scheduling link into the webhook
 * payload's `tracking` object, so the webhook can join on the inquiry ID
 * instead of guessing from phone numbers.
 */
export const INQUIRY_UTM_PARAM = "utm_content";

/** Inquiry IDs as issued by the repositories, e.g. `inq_<uuid>`. */
export const INQUIRY_ID_PATTERN = /^inq_[A-Za-z0-9-]{1,76}$/;

/**
 * Calendly's UTM parameter that carries the booking choice ("video_call" or
 * "store_visit"). On Calendly's free plan both buttons can share one event
 * type, so the webhook reads this to tell a store visit from a video call.
 */
export const BOOKING_TYPE_UTM_PARAM = "utm_term";

export const SCHEDULER_BOOKING_TYPES = ["video_call", "store_visit"] as const;
export type SchedulerBookingType = (typeof SCHEDULER_BOOKING_TYPES)[number];

/**
 * The link the embed loads: the inquiry ID as `utm_content` and the booking
 * choice as `utm_term` (each replacing any value the sheet link already had),
 * plus Calendly's display options that drop its own event and profile header
 * and cookie banner — the page draws its own header above the scheduler, so a
 * shared event type named for one purpose never shows on the other button.
 */
export function schedulerUrl(
  url: string,
  { inquiryId, bookingType }: { inquiryId?: string; bookingType?: SchedulerBookingType } = {},
) {
  const tracked = new URL(url);
  if (inquiryId) tracked.searchParams.set(INQUIRY_UTM_PARAM, inquiryId);
  if (bookingType) tracked.searchParams.set(BOOKING_TYPE_UTM_PARAM, bookingType);
  tracked.searchParams.set("hide_event_type_details", "1");
  tracked.searchParams.set("hide_landing_page_details", "1");
  tracked.searchParams.set("hide_gdpr_banner", "1");
  return tracked.toString();
}
