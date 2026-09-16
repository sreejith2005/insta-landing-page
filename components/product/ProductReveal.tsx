"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";

import { SecondaryActions } from "@/components/conversion/SecondaryActions";
import { Progress } from "@/components/landing/Progress";
import { AppointmentChooser } from "@/components/scheduling/AppointmentChooser";
import type { PublicProductContext } from "@/types/funnel";
import type { IncomingInstagramContext } from "@/types/funnel";
import { trackFunnelEvent, type TrackingContext } from "@/lib/attribution/client-events";

export function ProductReveal({ product, inquiryId, customerId, sessionId, context }: { product: PublicProductContext; inquiryId: string; customerId?: string; sessionId: string; context?: IncomingInstagramContext }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const hasTrackingContext = Boolean(context);
  const tracking = useMemo<TrackingContext>(() => ({
    sessionId,
    inquiryId,
    customerId,
    productId: product.productId,
    reelId: context?.reelId ?? "unknown",
    campaignId: product.campaign.campaignId,
    landingPageVersion: "phase1",
  }), [context?.reelId, customerId, inquiryId, product.campaign.campaignId, product.productId, sessionId]);
  useEffect(() => {
    heading.current?.focus();
    if (hasTrackingContext) void trackFunnelEvent("product_revealed", tracking);
  }, [hasTrackingContext, tracking]);
  return (
    <div className="reveal" aria-live="polite">
      <Progress active={1} />
      <div className="reveal-grid">
        <div className="reveal-copy">
          <h1 ref={heading} tabIndex={-1}>Meet your selected piece</h1>
          <div className="product-media mobile-media">
            {product.productImage ? <Image src={product.productImage.src} alt={product.productImage.alt} width={product.productImage.width} height={product.productImage.height} sizes="(max-width: 760px) 100vw, 48vw" /> : <span>Approved product image unavailable</span>}
          </div>
          <h2 className="product-name">{product.productName}</h2>
          <p className="product-reference">{product.productId}</p>
          <dl className="specifications">{product.specifications.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
          {product.campaign.offerCopy ? <p className="offer-copy">{product.campaign.offerCopy}</p> : null}
          <AppointmentChooser calendly={product.calendly} tracking={tracking} />
          <SecondaryActions inquiryId={inquiryId} sessionId={sessionId} whatsappEnabled={product.ctas.whatsappEnabled} callbackEnabled={product.ctas.callbackEnabled} tracking={tracking} />
        </div>
        <div className="product-media desktop-media" aria-hidden="true">
          {product.productImage ? <Image src={product.productImage.src} alt="" width={product.productImage.width} height={product.productImage.height} sizes="48vw" /> : <span>◇</span>}
        </div>
      </div>
    </div>
  );
}
