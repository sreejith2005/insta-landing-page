import Image from "next/image";

import { experienceCopy, journeySteps, reassurancePoints, whyReasons } from "@/config/experience";
import { Reveal, ScrollCta } from "./motion";

export function WhySection() {
  return (
    <section className="band band-warm why-band" aria-labelledby="why-heading">
      <div className="container why-layout">
        <Reveal className="section-intro align-left why-intro">
          <p className="eyebrow">Why enquire with MK Jewels</p>
          <h2 id="why-heading">
            A more personal way <em>to find your piece</em>
          </h2>
          <p className="section-lede">
            You have already chosen what caught your eye. From here, our team takes it forward with you.
          </p>
        </Reveal>
        <ol className="why-list">
          {whyReasons.map((reason, index) => (
            <Reveal as="li" className="why-item" key={reason.title} delay={index * 90}>
              <span className="why-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{reason.title}</h3>
                <p>{reason.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

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

export function ReassuranceSection() {
  return (
    <section className="band band-dark reassurance-band" aria-labelledby="reassurance-heading">
      <div className="container">
        <Reveal className="reassurance-layout">
          <div className="section-intro on-dark align-left">
            <p className="eyebrow">Enquire with confidence</p>
            <h2 id="reassurance-heading">Simple, private, and personal.</h2>
          </div>
          <ul className="reassurance-list">
            {reassurancePoints.map((point) => (
              <li key={point.title}>
                <span className="reassurance-mark" aria-hidden="true">◇</span>
                <div>
                  <h3>{point.title}</h3>
                  <p>{point.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
        <div className="reassurance-cta">
          <ScrollCta source="final" className="cta-link cta-gold">
            {experienceCopy.finalCtaText}
          </ScrollCta>
        </div>
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
