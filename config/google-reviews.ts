/**
 * APPROVED Google review snippets shown below the enquiry form / success state.
 *
 * Static and config-driven: copy real public reviews from the MK Jewels Google
 * Business Profile verbatim, with the aggregate rating and review count exactly
 * as Google shows them. No scraping or live API fetching.
 *
 * Feeds `socialProof.googleReviews`, so while this is disabled or incomplete
 * the section falls back to labelled development placeholders outside
 * production and is removed entirely in production. It is shown only when
 * `enabled` is true AND `rating`, `reviewCount` and at least one review with a
 * name and text are present (see `lib/social-proof/resolve-social-proof.ts`).
 */
import type { GoogleReviewsContent } from "./social-proof";

export const googleReviews: GoogleReviewsContent = {
  enabled: false,
  // rating: "4.8",
  // reviewCount: "1,240",
  // profileUrl: "https://maps.google.com/?cid=...",
  reviews: [
    // { name: "Reviewer's Google name", rating: 5, text: "Verbatim review text.", date: "March 2026" },
  ],
};
