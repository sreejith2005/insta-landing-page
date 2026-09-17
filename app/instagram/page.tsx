import { randomUUID } from "node:crypto";

import { after } from "next/server";

import { BrandHeader } from "@/components/brand/BrandHeader";
import { ContextState } from "@/components/landing/ContextState";
import { FunnelExperience } from "@/components/landing/FunnelExperience";
import { publicEnv, serverEnv } from "@/lib/config/env";
import { repository } from "@/lib/providers/repository";
import { resolveProductContext } from "@/lib/products/resolve-product";
import { incomingContextSchema } from "@/lib/validation/schemas";

type Search = Record<string, string | string[] | undefined>;

/** Query parameters are single-valued; repeated keys are rejected as invalid. */
function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function InstagramPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const env = serverEnv();
  const supportUrl = env.assistedSupportUrl;
  const parsed = incomingContextSchema.safeParse({
    productId: single(query.product),
    reelId: single(query.reel),
    campaignId: single(query.campaign),
    source: single(query.source) ?? undefined,
    utmSource: single(query.utm_source),
    utmMedium: single(query.utm_medium),
    utmCampaign: single(query.utm_campaign),
    utmContent: single(query.utm_content),
    utmTerm: single(query.utm_term),
  });
  if (!parsed.success) return <ContextState status="missing" supportUrl={supportUrl} />;

  const runtime = publicEnv();
  let resolved;
  try {
    resolved = await resolveProductContext(parsed.data, await repository());
  } catch (error) {
    console.error("Product context resolution failed:", error);
    return <ContextState status="invalid" supportUrl={supportUrl} />;
  }

  if (resolved.status !== "resolved") {
    const context = parsed.data;
    const status = resolved.status;
    // Recorded after the response so a failed context never delays the page.
    after(async () => {
      try {
        const { recordEvent } = await import("@/lib/analytics/record-event");
        await recordEvent(
          {
            eventName: "context_failed",
            sessionId: randomUUID(),
            ...context,
            landingPageVersion: runtime.landingPageVersion,
            metadata: { reason: status },
          },
          await repository(),
        );
      } catch {
        console.error("Context failure event write failed");
      }
    });
    return <ContextState status={status} supportUrl={supportUrl} />;
  }

  return (
    <div className="shell">
      <BrandHeader preview={runtime.isPreview} />
      <FunnelExperience
        context={parsed.data}
        runtime={{
          landingPageVersion: runtime.landingPageVersion,
          offerUnlockedCopy: runtime.offerUnlockedCopy,
          representativeContactCopy: runtime.representativeContactCopy,
        }}
      />
    </div>
  );
}
