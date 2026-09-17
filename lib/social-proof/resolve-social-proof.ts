import type {
  GoogleReviewsContent,
  MediaProofItem,
  SocialProofContent,
  Testimonial,
  TrustMetric,
} from "@/config/social-proof";

export type ResolvedSocialProof = {
  trustMetrics: readonly TrustMetric[];
  googleReviews: GoogleReviewsContent | null;
  testimonials: readonly Testimonial[];
  mediaProof: readonly MediaProofItem[];
  /** Which rendered sections are development placeholders (labelled on the page). */
  placeholders: { trustMetrics: boolean; googleReviews: boolean; testimonials: boolean };
};

function usableReviews(content: GoogleReviewsContent | undefined) {
  if (!content?.enabled || !content.rating || !content.reviewCount) return null;
  const reviews = content.reviews.filter((review) => review.name.trim() && review.text.trim());
  return reviews.length ? { ...content, reviews } : null;
}

function usableTestimonials(items: readonly Testimonial[]) {
  return items.filter(
    (item) => item.name.trim() && item.quote.trim() && (item.type === "text" || Boolean(item.asset)),
  );
}

/**
 * Chooses what proof the page may show. Approved content always wins; a
 * placeholder is used only for an empty section, only when explicitly allowed,
 * and never when NODE_ENV is "production" — whatever the caller passes.
 */
export function resolveSocialProof(
  approved: SocialProofContent,
  placeholders: SocialProofContent,
  allowPlaceholders: boolean,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): ResolvedSocialProof {
  const allow = allowPlaceholders && nodeEnv !== "production";

  const approvedMetrics = approved.trustMetrics.filter((metric) => metric.value.trim() && metric.label.trim());
  const approvedReviews = usableReviews(approved.googleReviews);
  const approvedStories = usableTestimonials(approved.testimonials);

  const useMetricPlaceholder = allow && !approvedMetrics.length;
  const useReviewPlaceholder = allow && !approvedReviews;
  const useStoryPlaceholder = allow && !approvedStories.length;

  return {
    trustMetrics: useMetricPlaceholder ? placeholders.trustMetrics : approvedMetrics,
    googleReviews: useReviewPlaceholder ? usableReviews(placeholders.googleReviews) : approvedReviews,
    testimonials: useStoryPlaceholder ? usableTestimonials(placeholders.testimonials) : approvedStories,
    mediaProof: approved.mediaProof.filter((item) => item.src && item.alt),
    placeholders: {
      trustMetrics: useMetricPlaceholder,
      googleReviews: useReviewPlaceholder,
      testimonials: useStoryPlaceholder,
    },
  };
}
