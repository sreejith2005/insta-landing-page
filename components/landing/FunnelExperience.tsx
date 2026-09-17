"use client";

import { useEffect, useRef, useState } from "react";

import { experienceCopy } from "@/config/experience";
import { LeadForm } from "@/components/form/LeadForm";
import { HeroMedia, VideoSection } from "@/components/landing/BrandVideo";
import { FORM_SECTION_ID, Reveal, ScrollCta } from "@/components/landing/motion";
import {
  CtaBand,
  JourneySection,
  ProofCtaBand,
  ReassuranceSection,
  SiteFooter,
  WhySection,
} from "@/components/landing/Sections";
import { HERO_SECTION_ID, StickyCta } from "@/components/landing/StickyCta";
import { SuccessState } from "@/components/landing/SuccessState";
import { TrustMetrics } from "@/components/landing/TrustMetrics";
import { GoogleReviews } from "@/components/social-proof/GoogleReviews";
import { MediaProof } from "@/components/social-proof/MediaProof";
import { Testimonials } from "@/components/social-proof/Testimonials";
import { getSessionId } from "@/lib/attribution/session";
import { trackFunnelEvent } from "@/lib/attribution/client-events";
import type { BrandVideoSource } from "@/lib/media/brand-video";
import type { InquiryProof } from "@/lib/social-proof/inquiry-proof";
import type { ResolvedSocialProof } from "@/lib/social-proof/resolve-social-proof";
import type { AcceptedInquiry, IncomingInstagramContext } from "@/types/funnel";

export type FunnelRuntime = {
  landingPageVersion: string;
  offerUnlockedCopy?: string;
  representativeContactCopy?: string;
  brandVideo?: BrandVideoSource | null;
  inquiryProof?: InquiryProof | null;
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

/** Dynamic, per-selection enquiry count. Never merged with static trust metrics. */
function InquiryPill({ proof }: { proof: InquiryProof }) {
  const formatted = proof.count.toLocaleString("en-IN");
  const rest = proof.label.startsWith(formatted) ? proof.label.slice(formatted.length) : ` ${proof.label}`;
  return (
    <p className={`proof-pill ${proof.live ? "is-live" : ""}`}>
      <span className="proof-pill-mark" aria-hidden="true" />
      <span>
        <strong>{formatted}</strong>
        {rest}
      </span>
      {proof.live ? <span className="live-badge">Live</span> : null}
    </p>
  );
}

export function FunnelExperience({
  context,
  runtime,
}: {
  context: IncomingInstagramContext;
  runtime: FunnelRuntime;
}) {
  const [accepted, setAccepted] = useState<
    { inquiry: AcceptedInquiry; firstName: string } | null
  >(null);
  const viewed = useRef(false);
  const proof = runtime.socialProof ?? NO_PROOF;
  const film = runtime.brandVideo ?? null;
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

  if (accepted) {
    return (
      <>
        <SuccessState
          isRepeatCustomer={accepted.inquiry.isRepeatCustomer}
          offerCopy={runtime.offerUnlockedCopy}
          contactCopy={runtime.representativeContactCopy}
          firstName={accepted.firstName}
        />
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <main className="pre-submit">
        <section
          className={`band band-ivory hero-band${film ? " has-film" : ""}`}
          id={HERO_SECTION_ID}
          aria-labelledby="offer-heading"
        >
          <div className="container hero-grid">
            <div className="hero-top">
              {runtime.inquiryProof ? <InquiryPill proof={runtime.inquiryProof} /> : null}
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

        {film ? <VideoSection video={film} /> : null}
        <TrustMetrics metrics={proof.trustMetrics} placeholder={proof.placeholders.trustMetrics} />
        <WhySection />
        <CtaBand />
        <GoogleReviews content={proof.googleReviews} placeholder={proof.placeholders.googleReviews} />
        <Testimonials items={proof.testimonials} placeholder={proof.placeholders.testimonials} />
        <MediaProof items={proof.mediaProof} />
        {hasCustomerProof ? <ProofCtaBand /> : null}
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
                landingPageVersion={runtime.landingPageVersion}
                ctaText={experienceCopy.offerCtaText}
                privacyText={experienceCopy.privacy}
                onAccepted={(inquiry, _sessionId, fullName) => {
                  setAccepted({ inquiry, firstName: fullName });
                  window.scrollTo({ top: 0 });
                }}
              />
            </div>
          </div>
        </section>

        <ReassuranceSection />
      </main>
      <SiteFooter />
      <StickyCta />
    </>
  );
}
