/**
 * APPROVED customer testimonial videos, shown below the enquiry form / success
 * state. Film is the only testimonial format on this page.
 *
 * Drop each file under /public/testimonials/ (4:5 or 9:16 works best) and add
 * an entry only with the customer's consent. While this list is empty the
 * section renders nothing at all in production — the same placeholder gating as
 * the rest of `socialProof` (see `lib/social-proof/resolve-social-proof.ts`).
 *
 * `name`, `context` and `quote` are optional captions. They are deliberately
 * unset below: the films came in without attribution, and a card shows no
 * customer name until MK Jewels confirms each customer agreed to be named.
 * Fill them in then — nothing else needs to change.
 */
import type { Testimonial } from "./social-proof";

export type TestimonialVideo = Testimonial & { type: "video"; asset: string };

export const testimonialVideos: readonly TestimonialVideo[] = [
  { type: "video", asset: "/testimonials/client-story-1.mp4" },
  { type: "video", asset: "/testimonials/client-story-2.mp4" },
  { type: "video", asset: "/testimonials/client-story-3.mp4" },
  { type: "video", asset: "/testimonials/client-story-4.mp4" },
  { type: "video", asset: "/testimonials/client-story-5.mp4" },
];
