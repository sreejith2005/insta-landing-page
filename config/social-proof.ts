/**
 * APPROVED customer-facing proof for the Instagram funnel.
 *
 * Only facts, reviews, stories and media that MK Jewels has supplied AND
 * approved belong in this file. Everything starts empty; an empty section is
 * removed from the production page.
 *
 * Design-review placeholders live in `config/social-proof.development.ts` and
 * can never reach production (see `lib/social-proof/resolve-social-proof.ts`).
 * Asset locations are documented in docs/CONTENT_ASSETS.md.
 */
import { googleReviews } from "./google-reviews";
import { testimonialVideos } from "./testimonial-videos";
import { trustStats } from "./trust-stats";

/** A static, approved company fact, e.g. { value: "1 Lakh+", label: "Customers Served" }. */
export type TrustMetric = Readonly<{
  value: string;
  label: string;
}>;

export type GoogleReview = Readonly<{
  /** Reviewer's public Google display name. */
  name: string;
  rating: number;
  /** Verbatim review text. */
  text: string;
  /** As shown on Google, e.g. "March 2026". */
  date?: string;
}>;

export type GoogleReviewsContent = Readonly<{
  enabled: boolean;
  /** Aggregate rating exactly as shown on the Google Business Profile, e.g. "4.8". */
  rating?: string;
  /** Review count as shown on Google, e.g. "1,240". */
  reviewCount?: string;
  profileUrl?: string;
  reviews: readonly GoogleReview[];
}>;

export type Testimonial = Readonly<{
  type: "text" | "image" | "video";
  name: string;
  quote: string;
  /** /testimonials/... image (4:5 works best) or video file. Required for image/video. */
  asset?: string;
  /** Optional poster for a video testimonial. */
  poster?: string;
  /** e.g. "Bridal customer, Mumbai". */
  context?: string;
}>;

export type MediaProofItem = Readonly<{
  /** /media-proof/... image. Square crops work best. */
  src: string;
  alt: string;
  caption?: string;
}>;

export type SocialProofContent = {
  trustMetrics: readonly TrustMetric[];
  googleReviews: GoogleReviewsContent;
  testimonials: readonly Testimonial[];
  mediaProof: readonly MediaProofItem[];
};

export const socialProof: SocialProofContent = {
  /** Approved MK Jewels business facts only. Edited in `config/trust-stats.ts`. */
  trustMetrics: trustStats,
  /** Curated from real public Google reviews. No scraping. Edited in `config/google-reviews.ts`. */
  googleReviews,
  /** Approved customer video stories with consent. Edited in `config/testimonial-videos.ts`. */
  testimonials: testimonialVideos,
  /** Approved customer, bridal, store-event or press images. */
  mediaProof: [],
};
