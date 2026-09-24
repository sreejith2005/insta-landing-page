import { describe, expect, it } from "vitest";

import type { StoreRecord } from "@/lib/leads/contracts";
import { checkStorePin, createStaffSession, normalizePin, readStaffSession } from "./session";

const secret = "test-secret-that-is-long-enough-for-hmac-000";
const stores: StoreRecord[] = [
  { name: "Bandra", pin: "482913", active: true },
  { name: "Andheri", pin: "012345", active: true },
  { name: "Ulhasnagar", pin: "318842", active: false },
];

describe("store PINs", () => {
  it("unlocks only an active store with its own PIN", () => {
    expect(checkStorePin(stores, "Bandra", "482913")?.name).toBe("Bandra");
    expect(checkStorePin(stores, "Bandra", "482914")).toBeNull();
    expect(checkStorePin(stores, "Andheri", "482913")).toBeNull();
    expect(checkStorePin(stores, "Ulhasnagar", "318842")).toBeNull();
    expect(checkStorePin(stores, "Nowhere", "482913")).toBeNull();
  });

  it("tolerates Sheets dropping a PIN's leading zero", () => {
    expect(normalizePin("012345")).toBe(normalizePin("12345"));
    expect(checkStorePin([{ name: "Andheri", pin: "12345", active: true }], "Andheri", "012345")?.name).toBe("Andheri");
  });
});

describe("staff sessions", () => {
  const cookie = createStaffSession(stores[0], "Priya", secret);

  it("reads back a genuine login", () => {
    expect(readStaffSession(cookie, stores, secret)).toEqual({ store: "Bandra", staffName: "Priya" });
  });

  it("rejects tampering, another secret and expiry", () => {
    const [body, signature] = cookie.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), s: "Andheri" })).toString("base64url");
    expect(readStaffSession(`${forged}.${signature}`, stores, secret)).toBeNull();
    expect(readStaffSession(cookie, stores, `${secret}x`)).toBeNull();
    expect(readStaffSession(cookie, stores, secret, new Date(Date.now() + 31 * 24 * 60 * 60 * 1000))).toBeNull();
    expect(readStaffSession(undefined, stores, secret)).toBeNull();
  });

  it("signs a store's phones out when its PIN changes or it is switched off", () => {
    expect(readStaffSession(cookie, [{ ...stores[0], pin: "999999" }], secret)).toBeNull();
    expect(readStaffSession(cookie, [{ ...stores[0], active: false }], secret)).toBeNull();
  });
});
