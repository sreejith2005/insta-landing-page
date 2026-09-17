import { useEffect, useRef } from "react";

import { experienceCopy, successSteps } from "@/config/experience";

export function SuccessState({
  isRepeatCustomer,
  offerCopy,
  contactCopy,
  firstName,
}: {
  isRepeatCustomer: boolean;
  offerCopy?: string;
  contactCopy?: string;
  firstName?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <main className="success-state">
      <section className="band band-dark success-hero" aria-labelledby="success-heading">
        <div className="container success-inner">
          <div className="success-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" role="presentation">
              <circle className="success-ring" cx="32" cy="32" r="29" />
              <path className="success-check" d="m20 33 8 8 17-18" />
            </svg>
          </div>
          <p className="eyebrow on-dark">{experienceCopy.announcement}</p>
          <h1 id="success-heading" ref={heading} tabIndex={-1}>
            {offerCopy || experienceCopy.successHeadline}
          </h1>
          {isRepeatCustomer ? <p className="repeat-welcome">{experienceCopy.repeatWelcome}</p> : null}
          {firstName ? <p className="thank-you">Thank you, {firstName.split(/\s+/)[0]}.</p> : null}
          <p className="success-description">{experienceCopy.successDescription}</p>
          <p className="success-contact">{contactCopy || experienceCopy.representativeContact}</p>
        </div>
      </section>
      <section className="band band-ivory success-next" aria-labelledby="next-heading">
        <div className="container">
          <div className="section-intro">
            <p className="eyebrow">What happens next</p>
            <h2 id="next-heading">Your personal assistance has begun</h2>
          </div>
          <ol className="journey-list success-steps">
            {successSteps.map((step, index) => (
              <li className="journey-step" key={step.title}>
                <span className="journey-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="success-footnote">
            <span aria-hidden="true">◇</span> {experienceCopy.successFootnote}
          </p>
        </div>
      </section>
    </main>
  );
}
