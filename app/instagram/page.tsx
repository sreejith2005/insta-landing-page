import { randomUUID } from "node:crypto";

import { after } from "next/server";

import { BrandHeader } from "@/components/brand/BrandHeader";
import { ContextState } from "@/components/landing/ContextState";
import { FunnelExperience } from "@/components/landing/FunnelExperience";
import { TrustBar } from "@/components/landing/TrustBar";
import { inquiryProofConfig, secondVideoConfig } from "@/config/experience";
import { socialProof } from "@/config/social-proof";
import { DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF } from "@/config/social-proof.development";
import { normalizeDmTimestamp, normalizeInstagramUsername } from "@/lib/attribution/instagram-dm";
import { publicEnv, serverEnv } from "@/lib/config/env";
import { calendlyUrl } from "@/lib/contact/calendly";
import { whatsappContactUrl } from "@/lib/contact/whatsapp";
import { resolveBrandVideo } from "@/lib/media/brand-video";
import { repository } from "@/lib/providers/repository";
import { resolveProductContext } from "@/lib/products/resolve-product";
import { loadInquiryProof, resolveTrustBar } from "@/lib/social-proof/inquiry-proof";
import { resolveSocialProof } from "@/lib/social-proof/resolve-social-proof";
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
    instagramUsername: normalizeInstagramUsername(single(query.u) ?? single(query.ig)),
    dmReceivedAt: normalizeDmTimestamp(single(query.dm_ts)),
  });
  if (!parsed.success) return <ContextState status="missing" supportUrl={supportUrl} />;
  // The DM fields travel only with the lead submission; attribution alone feeds
  // resolution, analytics events and the enquiry count.
  const { instagramUsername, dmReceivedAt, ...attribution } = parsed.data;

  const runtime = publicEnv();
  let resolved;
  let dataRepository: Awaited<ReturnType<typeof repository>>;
  try {
    dataRepository = await repository();
    resolved = await resolveProductContext(attribution, dataRepository);
  } catch (error) {
    console.error("Product context resolution failed:", error);
    return <ContextState status="invalid" supportUrl={supportUrl} />;
  }

  if (resolved.status !== "resolved") {
    const context = attribution;
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
          dataRepository,
        );
      } catch {
        console.error("Context failure event write failed");
      }
    });
    return <ContextState status={status} supportUrl={supportUrl} />;
  }

  // Server-side only: the customer receives a formatted count, never the
  // product/Reel/campaign filter used to compute it.
  const inquiryProof = await loadInquiryProof(
    { ...inquiryProofConfig, ...env.inquiryCount },
    dataRepository,
    attribution,
  );
  // Placeholders are resolved here, on the server, and refused in production.
  const proof = resolveSocialProof(
    socialProof,
    DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF,
    env.showDevelopmentSocialProof,
    env.nodeEnv,
  );

  return (
    <div className="shell">
      <TrustBar content={resolveTrustBar(inquiryProof, proof.trustMetrics, proof.placeholders.trustMetrics)} />
      <BrandHeader preview={runtime.isPreview} />
      <FunnelExperience
        context={attribution}
        dm={{ instagramUsername, dmReceivedAt }}
        runtime={{
          landingPageVersion: runtime.landingPageVersion,
          offerUnlockedCopy: runtime.offerUnlockedCopy,
          representativeContactCopy: runtime.representativeContactCopy,
          brandVideo: resolveBrandVideo(runtime.brandVideoUrl),
          secondVideo: resolveBrandVideo(runtime.secondVideoUrl, undefined, secondVideoConfig),
          // Only the two booking links and the WhatsApp link leave the server;
          // the image URL and the rest of the product record stay internal.
          booking: {
            videoUrl: calendlyUrl(resolved.context.calendlyVideoUrl),
            storeUrl: calendlyUrl(resolved.context.calendlyStoreUrl),
          },
          whatsappUrl: whatsappContactUrl(env.crmWhatsappNumber, resolved.context),
          socialProof: proof,
        }}
      />
    </div>
  );
}
