import { describe, expect, it } from "vitest";

import { eventSchema, incomingContextSchema, leadSubmissionSchema } from "./schemas";

const valid = {
  fullName: "Ananya Shah",
  mobileNumber: "+91 98765 43210",
  pinCode: "400001",
  city: "Mumbai",
  productId: "MKBR639",
  reelId: "R123",
  campaignId: "RAKHI26",
  source: "instagram",
  sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
  idempotencyKey: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4:MKBR639:001",
  landingPageVersion: "phase1",
};

describe("leadSubmissionSchema", () => {
  it("accepts the four required fields and attribution", () => {
    const parsed = leadSubmissionSchema.parse(valid);
    expect(parsed.pinCode).toBe("400001");
    expect(parsed.mobileNumber).toBe("9876543210");
  });

  it("defaults the source when one is not supplied", () => {
    const { source, ...withoutSource } = valid;
    expect(source).toBe("instagram");
    expect(leadSubmissionSchema.parse(withoutSource).source).toBe("instagram");
  });

  it("leaves honeypot judgement to submitLead instead of failing field validation", () => {
    expect(leadSubmissionSchema.parse({ ...valid, company: "Acme" }).company).toBe("Acme");
  });

  it.each([
    ["fullName", ""],
    ["mobileNumber", "123"],
    ["pinCode", "000001"],
    ["pinCode", "4000"],
    ["city", "<script>"],
    ["productId", "../../secret"],
    ["source", "facebook"],
    ["utmSource", "<script>"],
    ["instagramUsername", "<b>x</b>"],
    ["instagramUsername", "x".repeat(61)],
    ["dmReceivedAt", "yesterday"],
  ])("rejects invalid %s", (key, value) => {
    expect(() => leadSubmissionSchema.parse({ ...valid, [key]: value })).toThrow();
  });
});

describe("leadSubmissionSchema DM fields", () => {
  it("accepts an Instagram username and DM timestamp", () => {
    expect(
      leadSubmissionSchema.parse({ ...valid, instagramUsername: "ananya.s", dmReceivedAt: "2026-09-17T14:13:04.000Z" }),
    ).toMatchObject({ instagramUsername: "ananya.s", dmReceivedAt: "2026-09-17T14:13:04.000Z" });
  });

  it("keeps both optional", () => {
    const parsed = leadSubmissionSchema.parse(valid);
    expect(parsed.instagramUsername).toBeUndefined();
    expect(parsed.dmReceivedAt).toBeUndefined();
  });
});

describe("incomingContextSchema", () => {
  const base = { productId: "RG5074", reelId: "R456", campaignId: "BRIDAL26" };

  it("carries the DM username and timestamp through", () => {
    expect(
      incomingContextSchema.parse({ ...base, instagramUsername: "ananya.s", dmReceivedAt: "2026-09-17T14:13:04.000Z" }),
    ).toMatchObject({ instagramUsername: "ananya.s", dmReceivedAt: "2026-09-17T14:13:04.000Z" });
  });

  it("drops a malformed DM value instead of rejecting the whole context", () => {
    const parsed = incomingContextSchema.safeParse({ ...base, instagramUsername: "<script>", dmReceivedAt: "soon" });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ productId: "RG5074" });
    expect(parsed.data?.instagramUsername).toBeUndefined();
    expect(parsed.data?.dmReceivedAt).toBeUndefined();
  });

  it("carries optional UTM attribution through", () => {
    expect(
      incomingContextSchema.parse({
        productId: "RG5074",
        reelId: "R456",
        campaignId: "BRIDAL26",
        source: "manychat",
        utmSource: "instagram",
        utmMedium: "reel",
      }),
    ).toMatchObject({ source: "manychat", utmSource: "instagram", utmMedium: "reel" });
  });

  it("treats a blank UTM value as absent", () => {
    expect(
      incomingContextSchema.parse({
        productId: "RG5074",
        reelId: "R456",
        campaignId: "BRIDAL26",
        utmSource: "",
      }).utmSource,
    ).toBeUndefined();
  });
});

describe("eventSchema", () => {
  it("accepts the attribution-only lifecycle and rejects removed reveal events", () => {
    const baseEvent = {
      sessionId: valid.sessionId,
      productId: valid.productId,
      reelId: valid.reelId,
      campaignId: valid.campaignId,
      source: valid.source,
      landingPageVersion: valid.landingPageVersion,
    };
    expect(eventSchema.parse({ ...baseEvent, eventName: "offer_unlocked" }).eventName).toBe(
      "offer_unlocked",
    );
    expect(() => eventSchema.parse({ ...baseEvent, eventName: "product_revealed" })).toThrow();
  });

  it("accepts the post-enquiry booking and WhatsApp events", () => {
    const baseEvent = {
      sessionId: valid.sessionId,
      inquiryId: "inq_1",
      productId: valid.productId,
      reelId: valid.reelId,
      campaignId: valid.campaignId,
      source: valid.source,
      landingPageVersion: valid.landingPageVersion,
    };
    for (const eventName of [
      "calendly_video_call_opened",
      "calendly_store_visit_opened",
      "calendly_date_time_selected",
      "calendly_event_scheduled",
      "whatsapp_contact_clicked",
    ]) {
      expect(eventSchema.parse({ ...baseEvent, eventName, metadata: { bookingType: "video_call" } }).eventName).toBe(eventName);
    }
  });
});

describe("Reel-level links and the product picker", () => {
  it("accepts an incoming context without a product, but still requires the Reel and campaign", () => {
    expect(incomingContextSchema.parse({ reelId: "R456", campaignId: "BRIDAL26" }).productId).toBeUndefined();
    expect(incomingContextSchema.safeParse({ productId: "RG5074", campaignId: "BRIDAL26" }).success).toBe(false);
    expect(incomingContextSchema.safeParse({ productId: "RG5074", reelId: "R456" }).success).toBe(false);
    expect(incomingContextSchema.safeParse({ productId: "bad id!", reelId: "R456", campaignId: "BRIDAL26" }).success).toBe(false);
    expect(incomingContextSchema.safeParse({ productId: "", reelId: "R456", campaignId: "BRIDAL26" }).success).toBe(false);
  });

  it("still requires a product on every lead submission", () => {
    const { productId, ...withoutProduct } = valid;
    expect(productId).toBe("MKBR639");
    expect(leadSubmissionSchema.safeParse(withoutProduct).success).toBe(false);
  });

  it("lets only product_picker_shown omit the product", () => {
    const event = {
      sessionId: valid.sessionId,
      reelId: valid.reelId,
      campaignId: valid.campaignId,
      source: valid.source,
      landingPageVersion: valid.landingPageVersion,
    };
    expect(eventSchema.parse({ ...event, eventName: "product_picker_shown" }).productId).toBeUndefined();
    expect(eventSchema.safeParse({ ...event, eventName: "product_picker_selected" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, eventName: "landing_view" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, eventName: "form_submitted" }).success).toBe(false);
    expect(
      eventSchema.parse({ ...event, eventName: "product_picker_selected", productId: "RG5074" }).productId,
    ).toBe("RG5074");
  });
});
