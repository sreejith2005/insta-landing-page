/**
 * The site address a QR code should open. NEXT_PUBLIC_APP_URL wins when it is a
 * real domain; while it is still the localhost default, the address this
 * request arrived on is used, so a deployment never prints a localhost QR.
 */
export function publicOrigin(headers: Headers, appUrl: string) {
  const configured = new URL(appUrl);
  if (configured.hostname !== "localhost" && configured.hostname !== "127.0.0.1") return configured.origin;
  const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host");
  const protocol = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  return host ? `${protocol}://${host}` : configured.origin;
}
