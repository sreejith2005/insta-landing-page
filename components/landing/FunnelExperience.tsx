"use client";

import { useEffect, useRef, useState } from "react";

import { experienceCopy } from "@/config/experience";
import { LeadForm } from "@/components/form/LeadForm";
import { ProductReveal } from "@/components/product/ProductReveal";
import { getSessionId } from "@/lib/attribution/session";
import { trackFunnelEvent } from "@/lib/attribution/client-events";
import type {
  AcceptedInquiry,
  IncomingInstagramContext,
  PublicProductContext,
} from "@/types/funnel";
import { Progress } from "./Progress";

export type FunnelRuntime = {
  landingPageVersion: string;
  captureBookings: boolean;
};

export function FunnelExperience({
  context,
  teaser,
  runtime,
}: {
  context: IncomingInstagramContext;
  teaser: PublicProductContext;
  runtime: FunnelRuntime;
}) {
  const [accepted, setAccepted] = useState<{ inquiry: AcceptedInquiry; sessionId: string } | null>(null);
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
    void trackFunnelEvent("product_context_resolved", tracking, {
      hasImage: Boolean(teaser.productImage),
      ...(teaser.productPosition ? { productPosition: teaser.productPosition } : {}),
    });
  }, [context, runtime.landingPageVersion, teaser.productImage, teaser.productPosition]);

  if (accepted) {
    return (
      <ProductReveal
        product={accepted.inquiry.product}
        inquiryId={accepted.inquiry.inquiryId}
        customerId={accepted.inquiry.customerId}
        isRepeatCustomer={accepted.inquiry.isRepeatCustomer}
        sessionId={accepted.sessionId}
        context={context}
        runtime={runtime}
      />
    );
  }

  return (
    <main className="pre-submit">
      <Progress active={0} />
      <div className="intro-rule" />
      <h1>{experienceCopy.heading}</h1>
      <p className="introduction">{experienceCopy.introduction}</p>
      {teaser.campaign.offerCopy ? <p className="offer-preview">{teaser.campaign.offerCopy}</p> : null}
      <LeadForm
        context={context}
        landingPageVersion={runtime.landingPageVersion}
        onAccepted={(inquiry, sessionId) => setAccepted({ inquiry, sessionId })}
      />
    </main>
  );
}
