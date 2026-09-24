import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Store pass codes, e.g. "MK30-7KQ4-X9MP": a prefix plus 8 random Crockford
 * base32 characters (40 bits, ~1.1 trillion codes). The alphabet leaves out
 * I, L, O and U so a code read aloud or typed by staff is hard to get wrong.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const BODY_LENGTH = 8;

export const PASS_CODE_PATTERN = /^[A-Z0-9]{2,8}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

export function generatePassCode(prefix: string) {
  const bytes = randomBytes(BODY_LENGTH);
  // 256 is a multiple of 32, so taking each byte mod 32 is unbiased.
  const body = Array.from(bytes, (byte) => ALPHABET[byte % 32]).join("");
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
}

/**
 * Tidies a code typed by staff: case, spaces and missing dashes are forgiven,
 * and the look-alikes O/I/L in the random part are read as 0/1/1. Returns null
 * for anything that cannot be a pass code.
 */
export function normalizePassCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length < BODY_LENGTH + 2 || compact.length > BODY_LENGTH + 8) return null;
  const prefix = compact.slice(0, -BODY_LENGTH);
  const body = compact.slice(-BODY_LENGTH).replace(/O/g, "0").replace(/[IL]/g, "1");
  const code = `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
  return PASS_CODE_PATTERN.test(code) ? code : null;
}

/**
 * The QR link carries `<code>.<signature>`. The signature is HMAC-SHA256 over a
 * versioned label and the code, truncated to 128 bits (22 base64url chars):
 * forging one for a chosen code is a 1-in-2^128 guess. It proves the link was
 * issued by MK Jewels; it does not prove who is holding it, which is why staff
 * still check the customer's mobile number.
 */
const SIGNATURE_BYTES = 16;
const SIGNATURE_LABEL = "mkj-pass:v1:";

function signature(code: string, secret: string) {
  return createHmac("sha256", secret).update(SIGNATURE_LABEL + code).digest().subarray(0, SIGNATURE_BYTES);
}

export function passToken(code: string, secret: string) {
  return `${code}.${signature(code, secret).toString("base64url")}`;
}

/** The code inside a genuine token, or null for a forged, altered or malformed one. */
export function verifyPassToken(token: string, secret: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const code = token.slice(0, dot);
  if (!PASS_CODE_PATTERN.test(code)) return null;
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = signature(code, secret);
  return given.length === expected.length && timingSafeEqual(given, expected) ? code : null;
}
