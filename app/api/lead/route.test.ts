import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "./route";

/**
 * Route-level cover for a defect the service-level tests could not see:
 * `submitLead` accepted experience defaults, but the route never passed them,
 * so globally configured Calendly and WhatsApp settings never reached the
 * reveal and the primary conversion path was dead in any deployment that
 * configured them by environment rather than per Product Master row.
 */
const originalEnv = { ...process.env };

function leadRequest(body: Record<string, unknown>, ip: string) {
  return new Request("http://localhost:3000/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function lead(overrides: Record<string, unknown> = {}) {
  const sessionId = crypto.randomUUID();
  return {
    fullName: "Ananya Shah",
    mobileNumber: "9876500011",
    pinCode: "400001",
    city: "Navi Mumbai",
    productId: "MKBR639",
    reelId: "R123",
    campaignId: "RAKHI26",
    source: "instagram",
    sessionId,
    idempotencyKey: `lead:${sessionId}:MKBR639:R123:RAKHI26`,
    landingPageVersion: "phase1",
    ...overrides,
  };
}

beforeEach(() => {
  process.env.CALENDLY_STORE_VISIT_URL = "https://calendly.com/mk/store-visit";
  process.env.CALENDLY_VIDEO_URL = "https://calendly.com/mk/video";
  process.env.WHATSAPP_NUMBER = "919999999999";
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("POST /api/lead", () => {
  it("delivers the globally configured Calendly and WhatsApp settings to the reveal", async () => {
    const response = await POST(leadRequest(lead(), "203.0.113.11"));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.product.calendly).toEqual({
      storeVisitUrl: "https://calendly.com/mk/store-visit",
      videoConsultationUrl: "https://calendly.com/mk/video",
    });
    expect(body.product.whatsapp.number).toBe("919999999999");
  });

  it("never exposes a price on the accepted product", async () => {
    const response = await POST(leadRequest(lead({ mobileNumber: "9876500012" }), "203.0.113.12"));
    const body = await response.json();
    expect(JSON.stringify(body)).not.toMatch(/price|internalPrice|₹/i);
  });

  it("returns field errors instead of an internal message when input is invalid", async () => {
    const response = await POST(
      leadRequest(lead({ pinCode: "000000", mobileNumber: "12345" }), "203.0.113.13"),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fields.pinCode?.[0]).toBe("Enter a valid six-digit PIN code.");
    expect(body.fields.mobileNumber?.[0]).toBe("Enter a valid Indian mobile number.");
  });
});
