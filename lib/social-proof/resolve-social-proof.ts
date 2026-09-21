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
  if (!content?.enabled) return null;
  const reviews = content.reviews.filter((review) => review.author.trim() && review.text.trim());
  return reviews.length ? { ...content, reviews } : null;
}

/** A testimonial is its film, so the film is the only thing it cannot go without. */
function usableTestimonials(items: readonly Testimonial[]) {
  return items.filter((item) => item.asset.trim());
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
  // There are no stand-in customer films, so this stays false: the flag means
  // "what is on the page is a placeholder", never "the section is empty".
  const storyPlaceholders = allow ? usableTestimonials(placeholders.testimonials) : [];
  const useStoryPlaceholder = !approvedStories.length && storyPlaceholders.length > 0;

  return {
    trustMetrics: useMetricPlaceholder ? placeholders.trustMetrics : approvedMetrics,
    googleReviews: useReviewPlaceholder ? usableReviews(placeholders.googleReviews) : approvedReviews,
    testimonials: useStoryPlaceholder ? storyPlaceholders : approvedStories,
    mediaProof: approved.mediaProof.filter((item) => item.src && item.alt),
    placeholders: {
      trustMetrics: useMetricPlaceholder,
      googleReviews: useReviewPlaceholder,
      testimonials: useStoryPlaceholder,
    },
  };
}
