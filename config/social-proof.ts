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
  author: string;
  /** Reviewer's public Google Maps contributor page; null when not supplied. */
  profileUrl: string | null;
  /** Verbatim review text. */
  text: string;
  /** Star rating as shown on Google. Stars are hidden when absent. */
  rating?: number;
  /** As shown on Google, e.g. "March 2026". */
  date?: string;
}>;

export type GoogleReviewsContent = Readonly<{
  enabled: boolean;
  /** Aggregate rating exactly as shown on the Google Business Profile, e.g. "4.8". Optional. */
  rating?: string;
  /** Review count as shown on Google, e.g. "1,240". Optional. */
  reviewCount?: string;
  profileUrl?: string;
  reviews: readonly GoogleReview[];
}>;

/**
 * A customer testimonial. Film is the only format: the customer speaks for
 * themselves, so there is no written quote to attribute to them. A card is
 * shown as soon as it has an `asset`; `name`, `quote` and `context` are
 * captions that stay off the card until MK Jewels has the customer's consent
 * to name them.
 */
export type Testimonial = Readonly<{
  type: "video";
  /** /testimonials/... video file. The only required field. */
  asset: string;
  /** Poster frame. Without one the card shows the film's own first frame. */
  poster?: string;
  /** Customer's name, only with their consent to be named. */
  name?: string;
  /** A short approved line from them. The film itself is the testimonial. */
  quote?: string;
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
