import { describe, expect, it } from "vitest";

import { appointmentSchema, incomingContextSchema, leadSubmissionSchema } from "./schemas";

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

  it("rejects a filled honeypot", () => {
    expect(() => leadSubmissionSchema.parse({ ...valid, company: "Acme" })).toThrow();
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
  ])("rejects invalid %s", (key, value) => {
    expect(() => leadSubmissionSchema.parse({ ...valid, [key]: value })).toThrow();
  });
});

describe("incomingContextSchema", () => {
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

describe("appointmentSchema", () => {
  const booking = {
    inquiryId: "inq_1",
    sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
    productId: "MKBR639",
    reelId: "R123",
    campaignId: "RAKHI26",
    source: "instagram",
    landingPageVersion: "phase1",
    appointmentType: "store_visit",
    idempotencyKey: "apt:d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4:store_visit",
  };

  it("accepts a Calendly-issued event reference", () => {
    expect(
      appointmentSchema.parse({
        ...booking,
        eventUri: "https://api.calendly.com/scheduled_events/abc",
      }).appointmentType,
    ).toBe("store_visit");
  });

  it("rejects an appointment type or event URI it did not issue", () => {
    expect(() => appointmentSchema.parse({ ...booking, appointmentType: "walk_in" })).toThrow();
    expect(() =>
      appointmentSchema.parse({ ...booking, eventUri: "https://evil.example/booking" }),
    ).toThrow();
  });
});
