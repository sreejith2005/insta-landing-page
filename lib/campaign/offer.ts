/**
 * Formats a campaign offer deadline for display.
 *
 * The PRD permits urgency only when it is real: the date comes from the Product
 * Master row, it is identical for every visitor, and it is never restarted per
 * session. An absent, unparseable, or already-passed date renders nothing at
 * all rather than a fabricated deadline.
 */
export function formatOfferDeadline(
  offerExpiresAt: string | undefined,
  now: Date = new Date(),
): string | undefined {
  if (!offerExpiresAt) return undefined;
  const expires = new Date(offerExpiresAt);
  if (Number.isNaN(expires.getTime()) || expires.getTime() <= now.getTime()) return undefined;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(expires);
}
