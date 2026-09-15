"use client";

import { useState } from "react";
import { experienceCopy } from "@/config/experience";
import type { AcceptedInquiry, IncomingInstagramContext, PublicProductContext } from "@/types/funnel";
import { LeadForm } from "@/components/form/LeadForm";
import { ProductReveal } from "@/components/product/ProductReveal";
import { Progress } from "./Progress";

export function FunnelExperience({ context, teaser }: { context: IncomingInstagramContext; teaser: PublicProductContext }) {
  const [accepted, setAccepted] = useState<{ inquiry: AcceptedInquiry; sessionId: string } | null>(null);
  if (accepted) return <ProductReveal product={accepted.inquiry.product} inquiryId={accepted.inquiry.inquiryId} customerId={accepted.inquiry.customerId} sessionId={accepted.sessionId} context={context} />;
  return (
    <main className="pre-submit">
      <Progress active={0} />
      <div className="intro-rule" />
      <h1>{experienceCopy.heading}</h1>
      <p className="introduction">{experienceCopy.introduction}</p>
      {teaser.campaign.offerCopy ? <p className="offer-preview">{teaser.campaign.offerCopy}</p> : null}
      <LeadForm context={context} onAccepted={(inquiry, sessionId) => setAccepted({ inquiry, sessionId })} />
    </main>
  );
}
