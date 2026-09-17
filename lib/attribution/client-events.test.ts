import { afterEach, describe, expect, it, vi } from "vitest";

import { trackFunnelEvent } from "./client-events";

describe("trackFunnelEvent", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only attribution and allowlisted metadata", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchSpy);
    await trackFunnelEvent(
      "offer_unlocked",
      {
        sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
        inquiryId: "inq_1",
        customerId: "cus_1",
        productId: "MKBR639",
        reelId: "R123",
        campaignId: "RAKHI26",
        source: "instagram",
        utmCampaign: "rakhi26",
        landingPageVersion: "phase1",
      },
      { reason: "accepted" },
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toMatchObject({
      eventName: "offer_unlocked",
      source: "instagram",
      utmCampaign: "rakhi26",
      metadata: { reason: "accepted" },
    });
    expect(Object.keys(body)).not.toEqual(
      expect.arrayContaining(["phone", "fullName", "pin", "mobileNumber"]),
    );
    expect(Object.keys(body.metadata)).not.toEqual(
      expect.arrayContaining(["phone", "fullName", "pin"]),
    );
  });
});
