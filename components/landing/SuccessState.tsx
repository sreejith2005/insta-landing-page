import { useEffect, useRef } from "react";

import { experienceCopy } from "@/config/experience";

export function SuccessState({
  isRepeatCustomer,
  offerCopy,
  contactCopy,
}: {
  isRepeatCustomer: boolean;
  offerCopy?: string;
  contactCopy?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <main className="success-state">
      <div className="intro-rule" />
      <h1 ref={heading} tabIndex={-1}>
        {offerCopy || experienceCopy.offerUnlocked}
      </h1>
      {isRepeatCustomer ? <p className="repeat-welcome">{experienceCopy.repeatWelcome}</p> : null}
      <p>{contactCopy || experienceCopy.representativeContact}</p>
    </main>
  );
}
