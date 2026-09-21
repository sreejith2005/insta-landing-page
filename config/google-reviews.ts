/**
 * APPROVED Google review snippets shown below the enquiry form / success state.
 *
 * Static and config-driven: real public reviews from the MK Jewels Google
 * Business Profile, copied verbatim. No scraping or live API fetching.
 *
 * Feeds `socialProof.googleReviews`. The section is shown when `enabled` is
 * true and at least one review has an author and text (see
 * `lib/social-proof/resolve-social-proof.ts`). The aggregate `rating` and
 * `reviewCount` are optional: add them only exactly as Google shows them.
 * An author is linked to `profileUrl` when present and shown as plain text
 * when it is null.
 */
import type { GoogleReviewsContent } from "./social-proof";

export const googleReviews: GoogleReviewsContent = {
  enabled: true,
  reviews: [
    {
      author: "Sneha Sunderdas",
      profileUrl: "https://www.google.com/maps/contrib/102154044133617547418/reviews?hl=en-IN",
      text: "Loved every minute in Mk store, the staff was kind, funny and understanding. Deepa understood my requirement; showed me everything without getting irritated. I wanted something subtle. Tehreem was a lovely host, she wrote me a personalised message which was very kind, came to see earrings going back with earrings and bracelet they have the best Collection in town had amazing time thank you MK jewellers.",
    },
    {
      author: "Rahul",
      profileUrl: null,
      text: "Had an amazing experience at this shop, thanks to the CRMs! They were incredibly welcoming, polite, and patient while helping me find the perfect piece. The customer service here is unmatched — Uma ma'am went above and beyond to answer all my questions about gold & diamond quality and certification. I never felt rushed or pressured to buy. Great communication skills, and made me feel like a valued customer from start to finish.",
    },
    {
      author: "Farha Siddiqui",
      profileUrl: "https://www.google.com/maps/contrib/110504287131016736832/reviews?hl=en-IN",
      text: "Absolutely stunning jewellery collection with exquisite designs that truly stand out. Every piece reflects exceptional craftsmanship, elegance, and attention to detail. The staff is incredibly courteous, professional, and welcoming. A very special thanks to Deepa for her outstanding service and dedication — the way she understands clients' preferences, patiently guides them, and ensures complete satisfaction is truly remarkable.",
    },
  ],
};
