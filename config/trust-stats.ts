/**
 * APPROVED static trust stats for the trust bar at the top of the Instagram
 * funnel, e.g. { value: "1 Lakh+", label: "Customers Served" } or
 * { value: "12", label: "Stores" }.
 *
 * Edit this list without touching component code. Only add facts MK Jewels has
 * approved: it feeds `socialProof.trustMetrics`, so an empty list falls back to
 * the labelled development placeholders outside production and renders nothing
 * in production (see `lib/social-proof/resolve-social-proof.ts`).
 *
 * The live enquiry count is shown beside these stats but is never added to or
 * blended with them.
 */
import type { TrustMetric } from "./social-proof";

export const trustStats: readonly TrustMetric[] = [];
