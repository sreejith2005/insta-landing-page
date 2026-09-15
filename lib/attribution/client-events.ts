import type { FunnelEventName } from "@/types/funnel";

export type TrackingContext = {
  sessionId: string;
  inquiryId?: string;
  customerId?: string;
  productId: string;
  reelId: string;
  campaignId: string;
  landingPageVersion: string;
};

export async function trackFunnelEvent(
  eventName: FunnelEventName,
  context: TrackingContext,
  metadata?: Record<string, string | number | boolean>,
) {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, ...context, metadata }),
      keepalive: true,
    });
  } catch {
    // Analytics must never block the customer journey.
  }
}
