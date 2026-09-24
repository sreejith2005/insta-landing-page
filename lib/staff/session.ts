import { createHmac, timingSafeEqual } from "node:crypto";

import type { StoreRecord } from "@/lib/leads/contracts";

/**
 * Staff login, kept in a signed cookie: the store, the staff member's name and
 * a fingerprint of the store's PIN. Changing a store's PIN in the Stores tab
 * (or switching the store off) signs every phone of that store out.
 */
export type StaffSession = { store: string; staffName: string };

type SessionPayload = { s: string; n: string; f: string; e: number };

export const STAFF_SESSION_DAYS = 30;
const SESSION_LABEL = "mkj-staff:v1:";
const PIN_LABEL = "mkj-store-pin:v1:";

/** `__Host-` pins the cookie to this host over HTTPS; plain HTTP dev cannot use it. */
export function staffCookieName(production: boolean) {
  return production ? "__Host-mkj_staff" : "mkj_staff";
}

/**
 * Lax rather than Strict: a QR opened from the phone camera is a navigation
 * from outside the browser, which Strict may send without the cookie. Every
 * action that changes data is a same-origin JSON POST, which Lax still blocks
 * from other sites.
 */
export function staffCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: STAFF_SESSION_DAYS * 24 * 60 * 60,
  };
}

/**
 * Sheets may show "012345" as 12345, so PINs are compared as digits with
 * leading zeros removed.
 */
export function normalizePin(pin: string) {
  return pin.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function pinFingerprint(store: string, pin: string, secret: string) {
  return hmac(secret, `${PIN_LABEL}${store}\n${normalizePin(pin)}`).slice(0, 22);
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** The active store this name and PIN unlock, or null. */
export function checkStorePin(stores: StoreRecord[], storeName: string, pin: string) {
  const store = stores.find((candidate) => candidate.active && candidate.name === storeName);
  if (!store || !normalizePin(store.pin)) return null;
  return safeEqual(normalizePin(store.pin), normalizePin(pin)) ? store : null;
}

export function createStaffSession(
  store: StoreRecord,
  staffName: string,
  secret: string,
  now: Date = new Date(),
) {
  const payload: SessionPayload = {
    s: store.name,
    n: staffName,
    f: pinFingerprint(store.name, store.pin, secret),
    e: now.getTime() + STAFF_SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(secret, SESSION_LABEL + body)}`;
}

/**
 * The staff member behind a cookie value, if it is genuine, unexpired, and its
 * store is still active with the same PIN.
 */
export function readStaffSession(
  value: string | undefined,
  stores: StoreRecord[],
  secret: string,
  now: Date = new Date(),
): StaffSession | null {
  if (!value) return null;
  const [body, signature, extra] = value.split(".");
  if (!body || !signature || extra !== undefined) return null;
  if (!safeEqual(signature, hmac(secret, SESSION_LABEL + body))) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.e !== "number" || payload.e < now.getTime()) return null;
  const store = stores.find((candidate) => candidate.active && candidate.name === payload.s);
  if (!store || !safeEqual(payload.f, pinFingerprint(store.name, store.pin, secret))) return null;
  return { store: store.name, staffName: payload.n };
}
