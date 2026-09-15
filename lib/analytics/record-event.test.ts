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
        landingPageVersion: "phase1",
        metadata: { appointmentType: "store_visit", phone: "9876543210" },
      },
      repository,
    );
    expect(repository.snapshot().events[0]?.metadata).toEqual({ appointmentType: "store_visit" });
  });
});
