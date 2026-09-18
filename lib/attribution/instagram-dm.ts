/**
 * Normalizers for the DM context ManyChat appends to the landing URL. Both
 * return `undefined` for anything unusable so a bad value is simply absent;
 * `incomingContextSchema` then applies the authoritative bounds.
 */

/** `@handle` and `handle` are the same account. */
export function normalizeInstagramUsername(value: string | undefined) {
  const handle = value?.trim().replace(/^@+/, "");
  return handle || undefined;
}

/** Below this a numeric timestamp is taken as Unix seconds, not milliseconds (≈ 1973 in ms). */
const SECONDS_CUTOFF = 100_000_000_000;

/** Accepts Unix milliseconds (or seconds) or any ISO 8601 string; returns ISO UTC. */
export function normalizeDmTimestamp(value: string | undefined) {
  const raw = value?.trim();
  if (!raw) return undefined;
  let ms: number;
  if (/^\d{1,16}$/.test(raw)) {
    const numeric = Number(raw);
    ms = numeric < SECONDS_CUTOFF ? numeric * 1000 : numeric;
  } else {
    ms = Date.parse(raw);
  }
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
