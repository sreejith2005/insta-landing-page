import { describe, expect, it } from "vitest";

import { DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF as placeholders } from "@/config/social-proof.development";
import { socialProof, type SocialProofContent } from "@/config/social-proof";
import { resolveSocialProof } from "./resolve-social-proof";

const empty: SocialProofContent = {
  trustMetrics: [],
  googleReviews: { enabled: false, reviews: [] },
  testimonials: [],
  mediaProof: [],
};

const approved: SocialProofContent = {
  trustMetrics: [{ value: "Approved value", label: "Approved label" }],
  googleReviews: {
    enabled: true,
    rating: "4.7",
    reviewCount: "312",
    reviews: [{ name: "Approved Reviewer", rating: 5, text: "Approved review." }],
  },
  testimonials: [{ type: "text", name: "Approved Customer", quote: "Approved story." }],
  mediaProof: [],
};

describe("resolveSocialProof", () => {
  it("never uses placeholders in production, even when explicitly allowed", () => {
    const resolved = resolveSocialProof(empty, placeholders, true, "production");
    expect(resolved.trustMetrics).toEqual([]);
    expect(resolved.googleReviews).toBeNull();
    expect(resolved.testimonials).toEqual([]);
    expect(resolved.placeholders).toEqual({ trustMetrics: false, googleReviews: false, testimonials: false });
  });

  it("uses labelled placeholders for empty sections only when allowed outside production", () => {
    const resolved = resolveSocialProof(empty, placeholders, true, "development");
    expect(resolved.trustMetrics).toHaveLength(4);
    expect(resolved.googleReviews?.reviews).toHaveLength(3);
    expect(resolved.testimonials.length).toBeGreaterThan(0);
    expect(resolved.placeholders).toEqual({ trustMetrics: true, googleReviews: true, testimonials: true });
    expect(resolveSocialProof(empty, placeholders, false, "development").googleReviews).toBeNull();
  });

  it("prefers approved content over placeholders", () => {
    const resolved = resolveSocialProof(approved, placeholders, true, "development");
    expect(resolved.trustMetrics).toEqual(approved.trustMetrics);
    expect(resolved.googleReviews?.reviews[0].name).toBe("Approved Reviewer");
    expect(resolved.testimonials[0].name).toBe("Approved Customer");
    expect(resolved.placeholders).toEqual({ trustMetrics: false, googleReviews: false, testimonials: false });
  });

  it("renders approved content in production", () => {
    const resolved = resolveSocialProof(approved, placeholders, false, "production");
    expect(resolved.googleReviews?.rating).toBe("4.7");
    expect(resolved.testimonials).toHaveLength(1);
  });

  it("hides disabled or incomplete Google review data and asset-less media testimonials", () => {
    const resolved = resolveSocialProof(
      {
        ...empty,
        googleReviews: { ...approved.googleReviews, enabled: false },
        testimonials: [{ type: "image", name: "No Asset", quote: "Missing image." }],
      },
      placeholders,
      false,
      "production",
    );
    expect(resolved.googleReviews).toBeNull();
    expect(resolved.testimonials).toEqual([]);
  });

  it("ships with no approved content that could be mistaken for placeholders", () => {
    expect(JSON.stringify(socialProof)).not.toMatch(/placeholder|XX|X,XXX/i);
  });
});
