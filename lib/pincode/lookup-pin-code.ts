import { z } from "zod";

import { PIN_CODE } from "@/lib/validation/lead-fields";

export type PinCodeLocation = { city: string; state: string };

/**
 * `null` means India Post has no such PIN. A thrown error means the lookup
 * itself failed, so callers can tell "unknown PIN" from "service down".
 */
export type PinCodeLookup = (pinCode: string) => Promise<PinCodeLocation | null>;

const ENDPOINT = "https://api.postalpincode.in/pincode/";
const TIMEOUT_MS = 2_500;
const FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NOT_FOUND_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 5_000;

const responseSchema = z
  .array(
    z.object({
      Status: z.string(),
      PostOffice: z
        .array(z.object({ District: z.string().optional(), State: z.string().optional() }))
        .nullable()
        .optional(),
    }),
  )
  .min(1);

/** Process-local: PIN geography practically never changes, so entries live long. */
const cache = new Map<string, { value: PinCodeLocation | null; expiresAt: number }>();

export function clearPinCodeCache() {
  cache.clear();
}

/** City is the post office's district, which is how customers name their city. */
export function locationFromResponse(body: unknown): PinCodeLocation | null {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new Error("Unexpected PIN code response shape.");
  const [result] = parsed.data;
  if (result.Status !== "Success") return null;
  const office = result.PostOffice?.find((entry) => entry.District?.trim() && entry.State?.trim());
  return office ? { city: office.District!.trim(), state: office.State!.trim() } : null;
}

export const lookupPinCode: PinCodeLookup = async (pinCode) => {
  if (!PIN_CODE.test(pinCode)) return null;
  const now = Date.now();
  const cached = cache.get(pinCode);
  if (cached && cached.expiresAt > now) return cached.value;

  const response = await fetch(`${ENDPOINT}${pinCode}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`PIN code lookup failed with ${response.status}.`);
  const value = locationFromResponse(await response.json());

  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(pinCode, { value, expiresAt: now + (value ? FOUND_TTL_MS : NOT_FOUND_TTL_MS) });
  return value;
};
