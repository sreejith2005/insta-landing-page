import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PreviewRepository } from "@/lib/providers/preview-repository";
import { repository } from "@/lib/providers/repository";
import { POST } from "./route";

const key = "calendly-test-signing-key";

function webhook(body: unknown, { signingKey = key, timestamp = Math.floor(Date.now() / 1000) } = {}) {
  const raw = JSON.stringify(body);
  const signature = createHmac("sha256", signingKey).update(`${timestamp}.${raw}`).digest("hex");
  return new Request("http://localhost:3000/api/webhooks/calendly", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Calendly-Webhook-Signature": `t=${timestamp},v1=${signature}` },
    body: raw,
  });
}

const inviteeCreated = (uri: string, tracking: Record<string, unknown> | string = { utm_source: null }) => ({
  created_at: "2026-09-18T10:00:00.000000Z",
  event: "invitee.created",
  payload: {
    uri,
    email: "webhook@example.com",
    name: "Webhook Customer",
    first_name: null,
    text_reminder_number: "+91 98765 00099",
    questions_and_answers: [],
    tracking,
    scheduled_event: {
      uri: "https://api.calendly.com/scheduled_events/E9",
      name: "Store visit",
      start_time: "2026-09-21T09:00:00.000000Z",
      end_time: "2026-09-21T09:30:00.000000Z",
      event_type: "https://api.calendly.com/event_types/STORE",
    },
  },
});

async function preview() {
  return (await repository()) as PreviewRepository;
}

describe("POST /api/webhooks/calendly", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDLY_WEBHOOK_SIGNING_KEY", key);
    vi.stubEnv("CALENDLY_STORE_EVENT_TYPES", "https://api.calendly.com/event_types/STORE");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("logs the booked time from a signed invitee.created, joined to the enquiry", async () => {
    await (await preview()).acceptLead(
      {
        fullName: "Webhook Customer",
        mobileNumber: "9876500099",
        pinCode: "400001",
        city: "Mumbai",
        productId: "MKBR639",
        reelId: "R123",
        campaignId: "RAKHI26",
        source: "instagram",
        sessionId: crypto.randomUUID(),
        idempotencyKey: `webhook-test-${crypto.randomUUID()}`,
        landingPageVersion: "phase1",
      },
      { productId: "MKBR639", productName: "Internal", reelId: "R123", campaignId: "RAKHI26" },
    );
    const uri = `https://api.calendly.com/scheduled_events/E9/invitees/${crypto.randomUUID()}`;

    const response = await POST(webhook(inviteeCreated(uri)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, wasReplay: false });
    expect((await preview()).snapshot().bookings.find((booking) => booking.inviteeUri === uri)).toMatchObject({
      bookingType: "store_visit",
      scheduledStart: "2026-09-21T09:00:00.000000Z",
      scheduledEnd: "2026-09-21T09:30:00.000000Z",
      inviteeEmail: "webhook@example.com",
      attribution: expect.objectContaining({ productId: "MKBR639", reelId: "R123", campaignId: "RAKHI26" }),
    });
    expect(await (await POST(webhook(inviteeCreated(uri)))).json()).toEqual({ ok: true, wasReplay: true });
  });

  it("joins on the inquiry ID Calendly echoes back in tracking.utm_content", async () => {
    const accepted = await (await preview()).acceptLead(
      {
        fullName: "Tracked Customer",
        mobileNumber: "9876500077",
        pinCode: "400001",
        city: "Mumbai",
        productId: "RG5074",
        reelId: "R123",
        campaignId: "RAKHI26",
        source: "manychat",
        sessionId: crypto.randomUUID(),
        idempotencyKey: `webhook-test-${crypto.randomUUID()}`,
        landingPageVersion: "phase1",
      },
      { productId: "RG5074", productName: "Internal", reelId: "R123", campaignId: "RAKHI26" },
    );
    const uri = `https://api.calendly.com/scheduled_events/E9/invitees/${crypto.randomUUID()}`;
    // The invitee's Calendly phone belongs to a different enquiry: the tracked ID must win.
    const body = inviteeCreated(uri, { utm_source: null, utm_content: accepted.inquiryId });

    expect((await POST(webhook(body))).status).toBe(200);
    expect((await preview()).snapshot().bookings.find((booking) => booking.inviteeUri === uri)?.attribution).toMatchObject({
      inquiryId: accepted.inquiryId,
      productId: "RG5074",
      referenceNumber: expect.stringMatching(/^MK-\d{4}-/),
    });
  });

  it("still records a booking whose tracking block is malformed", async () => {
    const uri = `https://api.calendly.com/scheduled_events/E9/invitees/${crypto.randomUUID()}`;
    expect((await POST(webhook(inviteeCreated(uri, "not-an-object")))).status).toBe(200);
    expect((await preview()).snapshot().bookings.some((booking) => booking.inviteeUri === uri)).toBe(true);
  });

  it("rejects unsigned, mis-signed and stale requests", async () => {
    const body = inviteeCreated("https://api.calendly.com/scheduled_events/E9/invitees/X");
    expect((await POST(webhook(body, { signingKey: "wrong" }))).status).toBe(401);
    expect((await POST(webhook(body, { timestamp: Math.floor(Date.now() / 1000) - 600 }))).status).toBe(401);
    const unsigned = new Request("http://localhost:3000/api/webhooks/calendly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect((await POST(unsigned)).status).toBe(401);
  });

  it("acknowledges other signed events without writing, and rejects malformed invitees", async () => {
    const before = (await preview()).snapshot().bookings.length;
    expect(await (await POST(webhook({ event: "invitee.canceled", payload: {} }))).json()).toEqual({
      ok: true,
      ignored: true,
    });
    expect((await POST(webhook({ event: "invitee.created", payload: { email: "not-an-email" } }))).status).toBe(400);
    expect((await preview()).snapshot().bookings).toHaveLength(before);
  });

  it("is disabled without a signing key", async () => {
    vi.stubEnv("CALENDLY_WEBHOOK_SIGNING_KEY", "");
    expect((await POST(webhook({ event: "invitee.created" }))).status).toBe(503);
  });
});
