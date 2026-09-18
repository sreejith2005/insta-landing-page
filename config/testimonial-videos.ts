/**
 * APPROVED customer testimonial videos, shown below the enquiry form / success
 * state. The first entry is featured.
 *
 * Drop each file under /public/testimonials/ (4:5 works best) and add an entry
 * only with the customer's consent. While this list is empty the section
 * renders nothing at all in production — the same placeholder gating as the
 * rest of `socialProof` (see `lib/social-proof/resolve-social-proof.ts`).
 */
import type { Testimonial } from "./social-proof";

export type TestimonialVideo = Testimonial & { type: "video"; asset: string };

export const testimonialVideos: readonly TestimonialVideo[] = [
  // {
  //   type: "video",
  //   name: "Customer name",
  //   quote: "A short, approved line from their story.",
  //   asset: "/testimonials/customer-name.mp4",
  //   poster: "/testimonials/customer-name.jpg",
  //   context: "Bridal customer, Mumbai",
  // },
];
