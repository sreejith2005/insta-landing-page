import Image from "next/image";

import { experienceCopy, journeySteps } from "@/config/experience";
import { Reveal, ScrollCta } from "./motion";

export function CtaBand() {
  return (
    <section className="band band-dark cta-band" aria-labelledby="cta-band-heading">
      <Reveal className="container cta-band-inner">
        <p className="eyebrow on-dark">{experienceCopy.announcement}</p>
        <h2 id="cta-band-heading">
          The piece you noticed deserves <em>a closer look.</em>
        </h2>
        <p className="cta-band-offer">{experienceCopy.offerLabel}</p>
        <ScrollCta source="mid" className="cta-link cta-gold">
          {experienceCopy.midCtaText}
        </ScrollCta>
      </Reveal>
    </section>
  );
}

/** Repeated conversion point after the proof sections. Scrolls to the one form. */
export function ProofCtaBand() {
  return (
    <section className="band band-dark cta-band proof-cta-band" aria-labelledby="proof-cta-heading">
      <Reveal className="container cta-band-inner">
        <p className="eyebrow on-dark">{experienceCopy.proofCtaEyebrow}</p>
        <h2 id="proof-cta-heading">{experienceCopy.proofCtaHeading}</h2>
        <p className="cta-band-offer">{experienceCopy.proofCtaText}</p>
        <ScrollCta source="proof" className="cta-link cta-gold">
          {experienceCopy.proofCtaButton}
        </ScrollCta>
      </Reveal>
    </section>
  );
}

export function JourneySection() {
  return (
    <section className="band band-white journey-band" aria-labelledby="journey-heading">
      <div className="container">
        <Reveal className="section-intro">
          <p className="eyebrow">Your Instagram benefit</p>
          <h2 id="journey-heading">Three simple steps to your piece</h2>
        </Reveal>
        <ol className="journey-list">
          {journeySteps.map((step, index) => (
            <Reveal as="li" className="journey-step" key={step.label} delay={index * 110}>
              <span className="journey-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <p className="journey-label">{step.label}</p>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-logo">
          <Image src="/brand/mk-jewels-gold-on-black.jpeg" alt="MK Jewels" width={1600} height={378} sizes="140px" />
        </div>
        <p>{experienceCopy.privacy}</p>
        <p className="footer-legal">© {new Date().getFullYear()} MK Jewels. All rights reserved.</p>
      </div>
    </footer>
  );
}
