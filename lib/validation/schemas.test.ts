import { describe, expect, it } from "vitest";

import { leadSubmissionSchema } from "./schemas";

const valid = {
  fullName: "Ananya Shah",
  mobileNumber: "+91 98765 43210",
  pinCode: "400001",
  city: "Mumbai",
  productId: "MKBR639",
  reelId: "R123",
  campaignId: "RAKHI26",
  sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
  idempotencyKey: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4:MKBR639:001",
  landingPageVersion: "phase1",
};

describe("leadSubmissionSchema", () => {
  it("accepts the four required fields and attribution", () => {
    expect(leadSubmissionSchema.parse(valid).pinCode).toBe("400001");
  });

  it.each([
    ["fullName", ""],
    ["mobileNumber", "123"],
    ["pinCode", "000001"],
    ["pinCode", "4000"],
    ["city", "<script>"],
    ["productId", "../../secret"],
  ])("rejects invalid %s", (key, value) => {
    expect(() => leadSubmissionSchema.parse({ ...valid, [key]: value })).toThrow();
  });
});
