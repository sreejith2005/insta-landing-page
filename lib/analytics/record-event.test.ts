import { describe, expect, it } from "vitest";

import { PreviewRepository } from "@/lib/providers/preview-repository";
import { recordEvent } from "./record-event";

describe("recordEvent", () => {
  it("drops metadata keys outside the allowlist", async () => {
    const repository = new PreviewRepository();
    await recordEvent(
      {
        eventName: "landing_view",
        sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
        productId: "MKBR639",
        reelId: "R123",
        campaignId: "RAKHI26",
        source: "instagram",
        landingPageVersion: "phase1",
        metadata: { reason: "inactive", phone: "9876543210", city: "Mumbai" },
      },
      repository,
    );
    expect(repository.snapshot().events[0]?.metadata).toEqual({ reason: "inactive" });
  });

  it("preserves validated attribution on the stored event", async () => {
    const repository = new PreviewRepository();
    await recordEvent(
      {
        eventName: "context_resolved",
        sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
        productId: "RG5074",
        reelId: "R456",
        campaignId: "BRIDAL26",
        source: "manychat",
        utmSource: "instagram",
        utmMedium: "reel",
        landingPageVersion: "phase1",
      },
      repository,
    );
    expect(repository.snapshot().events[0]).toMatchObject({
      source: "manychat",
      utmSource: "instagram",
      utmMedium: "reel",
      productId: "RG5074",
    });
  });
});
