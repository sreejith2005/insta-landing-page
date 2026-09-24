"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { experienceCopy, secondVideoConfig } from "@/config/experience";
import { LeadForm } from "@/components/form/LeadForm";
import { HeroFilm, HeroMedia, VideoSection } from "@/components/landing/BrandVideo";
import { FORM_SECTION_ID, Reveal, ScrollCta } from "@/components/landing/motion";
import {
  CtaBand,
  JourneySection,
  ProofCtaBand,
  SiteFooter,
} from "@/components/landing/Sections";
import { HERO_SECTION_ID, StickyCta } from "@/components/landing/StickyCta";
import { SuccessState, type BookingLinks, type TrackSuccessEvent } from "@/components/landing/SuccessState";
import { GoogleReviews } from "@/components/social-proof/GoogleReviews";
import { MediaProof } from "@/components/social-proof/MediaProof";
import { Testimonials } from "@/components/social-proof/Testimonials";
import { getSessionId } from "@/lib/attribution/session";
import { trackFunnelEvent } from "@/lib/attribution/client-events";
import { withPassCode } from "@/lib/contact/whatsapp";
import type { BrandVideoSource } from "@/lib/media/brand-video";
import type { ResolvedSocialProof } from "@/lib/social-proof/resolve-social-proof";
import type { AcceptedInquiry, IncomingInstagramContext, InstagramDmContext } from "@/types/funnel";

export type FunnelRuntime = {
  landingPageVersion: string;
  offerUnlockedCopy?: string;
  representativeContactCopy?: string;
  brandVideo?: BrandVideoSource | null;
  /** Second film, below the enquiry form / success state. */
  secondVideo?: BrandVideoSource | null;
  /** Per-product Calendly links, shown once the offer is unlocked. */
  booking?: BookingLinks;
  /** CRM wa.me link with the product pre-filled, shown once the offer is unlocked. */
  whatsappUrl?: string;
  /** Resolved on the server: approved content, or labelled dev placeholders outside production. */
  socialProof?: ResolvedSocialProof;
};

const NO_PROOF: ResolvedSocialProof = {
  trustMetrics: [],
  googleReviews: null,
  testimonials: [],
  mediaProof: [],
  placeholders: { trustMetrics: false, googleReviews: false, testimonials: false },
};

/**
 * Below the funnel, in order: second film, Google reviews, testimonials (and
 * approved media). Each renders nothing when it has no approved content.
 */
function BelowFunnel({
  video,
  proof,
  submitted,
}: {
  video: BrandVideoSource | null;
  proof: ResolvedSocialProof;
  submitted: boolean;
}) {
  return (
    <>
      {video ? <VideoSection video={video} copy={secondVideoConfig} showCta={!submitted} /> : null}
      <GoogleReviews content={proof.googleReviews} placeholder={proof.placeholders.googleReviews} />
      <Testimonials items={proof.testimonials} placeholder={proof.placeholders.testimonials} />
      <MediaProof items={proof.mediaProof} />
    </>
  );
}

export function FunnelExperience({
  context,
  dm,
  runtime,
}: {
  context: IncomingInstagramContext;
  /** Submitted with the lead only; deliberately kept out of analytics events. */
  dm?: InstagramDmContext;
  runtime: FunnelRuntime;
}) {
  const [accepted, setAccepted] = useState<
    { inquiry: AcceptedInquiry; sessionId: string; firstName: string } | null
  >(null);
  const viewed = useRef(false);
  const proof = runtime.socialProof ?? NO_PROOF;
  const film = runtime.brandVideo ?? null;
  const secondFilm = runtime.secondVideo ?? null;
  const hasCustomerProof = Boolean(proof.googleReviews) || proof.testimonials.length > 0;

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    const tracking = {
      sessionId: getSessionId(),
      ...context,
      landingPageVersion: runtime.landingPageVersion,
    };
    void trackFunnelEvent("landing_view", tracking);
    void trackFunnelEvent("context_resolved", tracking);
  }, [context, runtime.landingPageVersion]);

  // Post-enquiry actions are tied to the accepted inquiry, never to lead PII.
  const trackSuccess = useCallback<TrackSuccessEvent>(
    (eventName, metadata) => {
      if (!accepted) return;
      void trackFunnelEvent(
        eventName,
        {
          sessionId: accepted.sessionId,
          inquiryId: accepted.inquiry.inquiryId,
          customerId: accepted.inquiry.customerId,
          ...context,
          landingPageVersion: runtime.landingPageVersion,
        },
        metadata,
      );
    },
    [accepted, context, runtime.landingPageVersion],
  );

  if (accepted) {
    return (
      <>
        <SuccessState
          isRepeatCustomer={accepted.inquiry.isRepeatCustomer}
          offerCopy={runtime.offerUnlockedCopy}
          contactCopy={runtime.representativeContactCopy}
          firstName={accepted.firstName}
          booking={runtime.booking}
          whatsappUrl={withPassCode(runtime.whatsappUrl, accepted.inquiry.pass?.code)}
          inquiryId={accepted.inquiry.inquiryId}
          pass={accepted.inquiry.pass}
          track={trackSuccess}
        />
        <BelowFunnel video={secondFilm} proof={proof} submitted />
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <main className="pre-submit">
        {film ? <HeroFilm video={film} /> : null}
        <section
          className={`band band-ivory hero-band${film ? " has-film" : ""}`}
          id={HERO_SECTION_ID}
          aria-labelledby="offer-heading"
        >
          <div className="container hero-grid">
            <div className="hero-top">
              <p className="eyebrow hero-eyebrow">{experienceCopy.offerEyebrow}</p>
              <h1 id="offer-heading">
                {experienceCopy.offerHeadlineLines.map((line, index) => (
                  <span className={index ? "headline-accent" : undefined} key={line}>
                    {line}{" "}
                  </span>
                ))}
              </h1>
              <p className="offer-label">
                <span className="offer-rule" aria-hidden="true" />
                {experienceCopy.offerLabel}
              </p>
            </div>
            <p className="introduction">{experienceCopy.offerDescription}</p>
            <HeroMedia />
            <div className="hero-actions">
              <ScrollCta source="hero" className="cta-link cta-primary">
                {experienceCopy.heroCtaText}
              </ScrollCta>
              <p className="cta-microcopy">{experienceCopy.ctaMicrocopy}</p>
            </div>
          </div>
        </section>

        <CtaBand />
        <JourneySection />

        <section
          className="band band-warm form-band"
          id={FORM_SECTION_ID}
          aria-labelledby="form-heading"
          tabIndex={-1}
        >
          <div className="container form-layout">
            <Reveal className="form-intro">
              <p className="eyebrow">{experienceCopy.formEyebrow}</p>
              <h2 id="form-heading">{experienceCopy.formHeading}</h2>
              <p className="section-lede">{experienceCopy.formIntro}</p>
              <div className="benefit-token" aria-hidden="true">
                <span className="benefit-token-figure">30%</span>
                <span className="benefit-token-text">
                  <small>Up to</small>
                  off making charges
                </span>
              </div>
            </Reveal>
            <div className="form-card">
              <p className="form-card-kicker">
                <span aria-hidden="true" />
                Private enquiry
                <span aria-hidden="true" />
              </p>
              <LeadForm
                context={context}
                dm={dm}
                landingPageVersion={runtime.landingPageVersion}
                ctaText={experienceCopy.offerCtaText}
                privacyText={experienceCopy.privacy}
                onAccepted={(inquiry, sessionId, fullName) => {
                  setAccepted({ inquiry, sessionId, firstName: fullName });
                  window.scrollTo({ top: 0 });
                }}
              />
            </div>
          </div>
        </section>

        <BelowFunnel video={secondFilm} proof={proof} submitted={false} />
        {hasCustomerProof ? <ProofCtaBand /> : null}
      </main>
      <SiteFooter />
      <StickyCta />
    </>
  );
}
