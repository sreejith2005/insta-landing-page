import { describe, expect, it, vi } from "vitest";

// Never reach the real India Post API from tests.
vi.mock("@/lib/pincode/lookup-pin-code", () => ({
  lookupPinCode: vi.fn().mockResolvedValue({ city: "Mumbai", state: "Maharashtra" }),
}));

import { POST } from "./route";

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

describe("POST /api/lead", () => {
  it("returns identifier-only success without Product_Master content", async () => {
    const response = await POST(leadRequest(lead(), "203.0.113.11"));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, isRepeatCustomer: false });
    expect(body.inquiryId).toMatch(/^inq_/);
    expect(body.customerId).toMatch(/^cus_/);
    expect(JSON.stringify(body)).not.toMatch(
      /productName|MKBR639|image|specification|price|calendly|whatsapp/i,
    );
  });

  it("returns field errors instead of internal details when input is invalid", async () => {
    const response = await POST(
      leadRequest(lead({ pinCode: "000000", mobileNumber: "12345" }), "203.0.113.12"),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fields.pinCode?.[0]).toBe("Enter a valid six-digit PIN code.");
    expect(body.fields.mobileNumber?.[0]).toBe("Enter a valid Indian mobile number.");
  });
});
