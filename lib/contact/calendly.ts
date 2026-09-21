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
 * The scheduling link with the inquiry ID set as `utm_content`, replacing any
 * `utm_content` the sheet link already had. Without an ID the link is unchanged.
 */
export function withInquiryTracking(url: string, inquiryId: string | undefined) {
  if (!inquiryId) return url;
  const tracked = new URL(url);
  tracked.searchParams.set(INQUIRY_UTM_PARAM, inquiryId);
  return tracked.toString();
}
