import { normalizeIndianPhone } from "@/lib/phone/normalize-indian-phone";
import type { LeadFields } from "@/types/funnel";

/**
 * The four lead-field rules, with no schema-library dependency.
 *
 * `lib/validation/schemas.ts` builds the authoritative server schema from these
 * same predicates, and the browser imports them directly. That keeps one
 * definition of "valid" while leaving Zod entirely on the server — it is the
 * largest dependency in the funnel and never needed to ship to a customer on
 * mobile data.
 */

/** Rejects angle brackets and control characters; everything else is allowed. */
const SAFE_TEXT = /^[^<>\u0000-\u001F]+$/;

export const PIN_CODE = /^[1-9][0-9]{5}$/;

export const fieldMessages = {
  pinCode: "Enter a valid six-digit PIN code.",
  mobileNumber: "Enter a valid Indian mobile number.",
} as const;

export function checkSafeText(value: string, label: string, max: number): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length < 2) return `${label} is required.`;
  if (trimmed.length > max) return `${label} is too long.`;
  if (!SAFE_TEXT.test(trimmed)) return `Enter a valid ${label.toLowerCase()}.`;
  return undefined;
}

export function checkPinCode(value: string): string | undefined {
  return PIN_CODE.test(value.trim()) ? undefined : fieldMessages.pinCode;
}

export function checkMobileNumber(value: string): string | undefined {
  try {
    normalizeIndianPhone(value);
    return undefined;
  } catch {
    return fieldMessages.mobileNumber;
  }
}

/**
 * Client-side pass over the four customer-entered fields. Machine-generated
 * payload values (session, idempotency key, attribution) are validated only by
 * the server, which remains authoritative for every field.
 */
export function validateLeadFields(fields: LeadFields) {
  const errors: Partial<Record<keyof LeadFields, string>> = {};
  const fullName = checkSafeText(fields.fullName, "Full name", 100);
  if (fullName) errors.fullName = "Enter your full name.";
  const mobileNumber = checkMobileNumber(fields.mobileNumber);
  if (mobileNumber) errors.mobileNumber = mobileNumber;
  const pinCode = checkPinCode(fields.pinCode);
  if (pinCode) errors.pinCode = pinCode;
  const city = checkSafeText(fields.city, "City", 80);
  if (city) errors.city = city;
  return errors;
}
