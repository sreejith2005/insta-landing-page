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
    reviews: [{ author: "Approved Reviewer", profileUrl: null, rating: 5, text: "Approved review." }],
  },
  testimonials: [{ type: "video", name: "Approved Customer", quote: "Approved story.", asset: "/testimonials/one.mp4" }],
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
    // No placeholder customer films exist, so that section simply stays empty
    // rather than being filled with a stand-in and labelled as one.
    expect(resolved.testimonials).toEqual([]);
    expect(resolved.placeholders).toEqual({ trustMetrics: true, googleReviews: true, testimonials: false });
    expect(resolveSocialProof(empty, placeholders, false, "development").googleReviews).toBeNull();
  });

  it("prefers approved content over placeholders", () => {
    const resolved = resolveSocialProof(approved, placeholders, true, "development");
    expect(resolved.trustMetrics).toEqual(approved.trustMetrics);
    expect(resolved.googleReviews?.reviews[0].author).toBe("Approved Reviewer");
    expect(resolved.testimonials[0].name).toBe("Approved Customer");
    expect(resolved.placeholders).toEqual({ trustMetrics: false, googleReviews: false, testimonials: false });
  });

  it("renders approved content in production", () => {
    const resolved = resolveSocialProof(approved, placeholders, false, "production");
    expect(resolved.googleReviews?.rating).toBe("4.7");
    expect(resolved.testimonials).toHaveLength(1);
  });

  it("hides disabled or incomplete Google review data and film-less testimonials", () => {
    const resolved = resolveSocialProof(
      {
        ...empty,
        googleReviews: { ...approved.googleReviews, enabled: false },
        testimonials: [{ type: "video", name: "No Film", quote: "Missing film.", asset: "  " }],
      },
      placeholders,
      false,
      "production",
    );
    expect(resolved.googleReviews).toBeNull();
    expect(resolved.testimonials).toEqual([]);
  });

  it("shows reviews without an aggregate rating or review count", () => {
    const { rating: _rating, reviewCount: _count, ...withoutAggregate } = approved.googleReviews;
    void _rating;
    void _count;
    const resolved = resolveSocialProof({ ...empty, googleReviews: withoutAggregate }, placeholders, false, "production");
    expect(resolved.googleReviews?.reviews).toHaveLength(1);
  });

  it("drops reviews missing an author or text", () => {
    const resolved = resolveSocialProof(
      {
        ...empty,
        googleReviews: {
          enabled: true,
          reviews: [
            { author: " ", profileUrl: null, text: "No author." },
            { author: "No Text", profileUrl: null, text: "" },
          ],
        },
      },
      placeholders,
      false,
      "production",
    );
    expect(resolved.googleReviews).toBeNull();
  });

  it("resolves the shipped reviews and trust stats as approved content, never placeholders", () => {
    for (const env of ["production", "development"]) {
      const resolved = resolveSocialProof(socialProof, placeholders, true, env);
      expect(resolved.trustMetrics).toEqual([
        { label: "Happy Customers", value: "2,00,000+" },
        { label: "Unique Designs", value: "5,000+" },
        { label: "Years of Trust", value: "27+" },
        { label: "Stores", value: "5" },
      ]);
      expect(resolved.googleReviews?.reviews.map((review) => review.author)).toEqual([
        "Sneha Sunderdas",
        "Rahul",
        "Farha Siddiqui",
      ]);
      expect(resolved.placeholders).toEqual({ trustMetrics: false, googleReviews: false, testimonials: false });
    }
  });

  it("ships with no approved content that could be mistaken for placeholders", () => {
    expect(JSON.stringify(socialProof)).not.toMatch(/placeholder|XX|X,XXX/i);
  });
});
