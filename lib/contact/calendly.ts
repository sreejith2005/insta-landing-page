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
