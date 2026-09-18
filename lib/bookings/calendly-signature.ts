import { createHmac, timingSafeEqual } from "node:crypto";

/** Calendly's documented replay window. */
const TOLERANCE_MS = 3 * 60_000;

/**
 * Verifies a `Calendly-Webhook-Signature: t=<unix seconds>,v1=<hex>` header:
 * v1 must be the hex HMAC-SHA256, keyed by the subscription's signing key, of
 * `${t}.${rawBody}`, and t must be within three minutes of now. The raw body
 * must be the exact bytes received, before any JSON parsing.
 */
export function verifyCalendlySignature(
  header: string | null,
  rawBody: string,
  signingKey: string,
  now: number = Date.now(),
): boolean {
  if (!header || !signingKey) return false;
  const parts = new Map(
    header.split(",").map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index).trim(), part.slice(index + 1).trim()] as const;
    }),
  );
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !/^\d{1,12}$/.test(timestamp) || !signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > TOLERANCE_MS) return false;

  const expected = createHmac("sha256", signingKey).update(`${timestamp}.${rawBody}`, "utf8").digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
