"use client";

import { useEffect, useRef, useState } from "react";

import { experienceCopy } from "@/config/experience";
import { LeadForm } from "@/components/form/LeadForm";
import { SuccessState } from "@/components/landing/SuccessState";
import { getSessionId } from "@/lib/attribution/session";
import { trackFunnelEvent } from "@/lib/attribution/client-events";
import type { AcceptedInquiry, IncomingInstagramContext } from "@/types/funnel";

export type FunnelRuntime = {
  landingPageVersion: string;
  offerUnlockedCopy?: string;
  representativeContactCopy?: string;
};

export function FunnelExperience({
  context,
  runtime,
}: {
  context: IncomingInstagramContext;
  runtime: FunnelRuntime;
}) {
  const [accepted, setAccepted] = useState<AcceptedInquiry | null>(null);
  const viewed = useRef(false);

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
      <SuccessState
        isRepeatCustomer={accepted.isRepeatCustomer}
        offerCopy={runtime.offerUnlockedCopy}
        contactCopy={runtime.representativeContactCopy}
      />
    );
  }

  return (
    <main className="pre-submit">
      <div className="intro-rule" />
      <h1>{experienceCopy.heading}</h1>
      <p className="introduction">{experienceCopy.introduction}</p>
      <LeadForm
        context={context}
        landingPageVersion={runtime.landingPageVersion}
        onAccepted={(inquiry) => setAccepted(inquiry)}
      />
    </main>
  );
}
