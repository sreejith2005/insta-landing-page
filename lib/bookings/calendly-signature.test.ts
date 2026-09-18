import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyCalendlySignature } from "./calendly-signature";

const key = "test-signing-key";
const body = '{"event":"invitee.created","payload":{}}';
const now = 1_790_000_000_000;
const t = String(now / 1000);
const sign = (timestamp: string, raw = body, signingKey = key) =>
  createHmac("sha256", signingKey).update(`${timestamp}.${raw}`).digest("hex");

describe("verifyCalendlySignature", () => {
  it("accepts Calendly's t=,v1= header over the raw body", () => {
    expect(verifyCalendlySignature(`t=${t},v1=${sign(t)}`, body, key, now)).toBe(true);
  });

  it("rejects a tampered body, wrong key, or missing parts", () => {
    expect(verifyCalendlySignature(`t=${t},v1=${sign(t)}`, body.replace("{}", '{"x":1}'), key, now)).toBe(false);
    expect(verifyCalendlySignature(`t=${t},v1=${sign(t, body, "other")}`, body, key, now)).toBe(false);
    expect(verifyCalendlySignature(`v1=${sign(t)}`, body, key, now)).toBe(false);
    expect(verifyCalendlySignature(`t=${t}`, body, key, now)).toBe(false);
    expect(verifyCalendlySignature(`t=${t},v1=abc`, body, key, now)).toBe(false);
    expect(verifyCalendlySignature(null, body, key, now)).toBe(false);
    expect(verifyCalendlySignature(`t=${t},v1=${sign(t)}`, body, "", now)).toBe(false);
  });

  it("rejects stale or future timestamps outside three minutes", () => {
    const old = String(now / 1000 - 181);
    expect(verifyCalendlySignature(`t=${old},v1=${sign(old)}`, body, key, now)).toBe(false);
    const recent = String(now / 1000 - 170);
    expect(verifyCalendlySignature(`t=${recent},v1=${sign(recent)}`, body, key, now)).toBe(true);
    const future = String(now / 1000 + 181);
    expect(verifyCalendlySignature(`t=${future},v1=${sign(future)}`, body, key, now)).toBe(false);
  });
});
