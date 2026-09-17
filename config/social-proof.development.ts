/**
 * ============================================================================
 * DEVELOPMENT PLACEHOLDERS — NOT APPROVED FOR PRODUCTION.
 * MUST BE REPLACED WITH APPROVED MK JEWELS FACTS BEFORE PRODUCTION.
 * ============================================================================
 *
 * Nothing in this file is a real metric, review or customer story. It exists
 * only so the page can be assessed visually during design review.
 *
 * It is used ONLY when `SHOW_DEVELOPMENT_SOCIAL_PROOF` is enabled outside
 * production, and only for sections with no approved content in
 * `config/social-proof.ts`. `resolveSocialProof` refuses it whenever
 * NODE_ENV is "production". Every rendered placeholder section is labelled
 * "Development placeholder" on the page.
 */
import type { SocialProofContent } from "./social-proof";

export const DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF: SocialProofContent = {
  // NOT APPROVED FOR PRODUCTION — placeholder figures, not MK Jewels facts.
  trustMetrics: [
    { value: "1 Lakh+", label: "Customers Served" },
    { value: "5+", label: "Stores" },
    { value: "10K+", label: "Designs" },
    { value: "XX+", label: "Years of Trust" },
  ],
  // NOT APPROVED FOR PRODUCTION — placeholder reviews, not real Google reviews.
  googleReviews: {
    enabled: true,
    rating: "4.9",
    reviewCount: "X,XXX",
    reviews: [
      {
        name: "Placeholder Reviewer",
        rating: 5,
        date: "Placeholder date",
        text: "Placeholder review. The team took time to understand what I wanted and helped me choose a necklace I will treasure for years.",
      },
      {
        name: "Placeholder Reviewer",
        rating: 5,
        date: "Placeholder date",
        text: "Placeholder review. Beautiful designs, patient guidance and a very personal experience from enquiry to purchase.",
      },
      {
        name: "Placeholder Reviewer",
        rating: 5,
        date: "Placeholder date",
        text: "Placeholder review. I enquired after seeing a piece on Instagram and was contacted quickly with every detail explained clearly.",
      },
    ],
  },
  // NOT APPROVED FOR PRODUCTION — placeholder stories, not real customers.
  testimonials: [
    {
      type: "text",
      name: "Placeholder Customer",
      context: "Placeholder · Bridal jewellery",
      quote: "Placeholder story. From the first call, it felt like the team was choosing with us, not selling to us. The set became the heart of our wedding day.",
    },
    {
      type: "text",
      name: "Placeholder Customer",
      context: "Placeholder · Anniversary gift",
      quote: "Placeholder story. They helped me find a piece that felt personal, not just beautiful.",
    },
    {
      type: "text",
      name: "Placeholder Customer",
      context: "Placeholder · Repeat customer",
      quote: "Placeholder story. Every visit feels unhurried and genuinely personal.",
    },
  ],
  mediaProof: [],
};
