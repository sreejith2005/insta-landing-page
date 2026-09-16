"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { experienceCopy } from "@/config/experience";
import { formatOfferDeadline } from "@/lib/campaign/offer";
import { SecondaryActions } from "@/components/conversion/SecondaryActions";
import { Progress } from "@/components/landing/Progress";
import type { FunnelRuntime } from "@/components/landing/FunnelExperience";
import { AppointmentChooser } from "@/components/scheduling/AppointmentChooser";
import { trackFunnelEvent, type TrackingContext } from "@/lib/attribution/client-events";
import type { IncomingInstagramContext, PublicProductContext } from "@/types/funnel";

type Props = {
  product: PublicProductContext;
  inquiryId: string;
  customerId?: string;
  isRepeatCustomer?: boolean;
  sessionId: string;
  context: IncomingInstagramContext;
  runtime: FunnelRuntime;
};

export function ProductReveal({
  product,
  inquiryId,
  customerId,
  isRepeatCustomer,
  sessionId,
  context,
  runtime,
}: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [appointmentStep, setAppointmentStep] = useState(false);

  const tracking = useMemo<TrackingContext>(
    () => ({
      sessionId,
      inquiryId,
      customerId,
      productId: context.productId,
      reelId: context.reelId,
      campaignId: context.campaignId,
      source: context.source,
      utmSource: context.utmSource,
      utmMedium: context.utmMedium,
      utmCampaign: context.utmCampaign,
      utmContent: context.utmContent,
      utmTerm: context.utmTerm,
      landingPageVersion: runtime.landingPageVersion,
    }),
    [context, customerId, inquiryId, runtime.landingPageVersion, sessionId],
  );

  // Server-driven and identical for every visitor; never a per-session timer.
  const offerDeadline = formatOfferDeadline(product.campaign.offerExpiresAt);

  useEffect(() => {
    heading.current?.focus();
    void trackFunnelEvent("product_revealed", tracking);
  }, [tracking]);

  return (
    // The heading receives focus on mount, which announces the new view. A live
    // region over the whole reveal would read the entire page on top of that.
    <div className="reveal">
      <Progress active={appointmentStep ? 2 : 1} />
      <div className="reveal-grid">
        <div className="reveal-copy">
          <h1 ref={heading} tabIndex={-1}>
            Meet your selected piece
          </h1>
          {isRepeatCustomer ? <p className="repeat-welcome">{experienceCopy.repeatWelcome}</p> : null}

          <div className="product-media mobile-media">
            {product.productImage ? (
              <Image
                src={product.productImage.src}
                alt={product.productImage.alt}
                width={product.productImage.width}
                height={product.productImage.height}
                sizes="(max-width: 760px) 100vw, 48vw"
              />
            ) : (
              <span>Approved product image unavailable</span>
            )}
          </div>

          <h2 className="product-name">{product.productName}</h2>
          <p className="product-reference">
            {product.productId}
            {product.collection ? ` · ${product.collection}` : ""}
          </p>

          <dl className="specifications">
            {product.specifications.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>

          {product.campaign.offerCopy ? (
            <p className="offer-copy">
              {product.campaign.offerCopy}
              {offerDeadline ? (
                <span className="offer-deadline">Campaign offer valid until {offerDeadline}.</span>
              ) : null}
            </p>
          ) : null}

          <AppointmentChooser
            calendly={product.calendly}
            tracking={tracking}
            captureBookings={runtime.captureBookings}
            onSelected={() => setAppointmentStep(true)}
          />
          <SecondaryActions
            inquiryId={inquiryId}
            sessionId={sessionId}
            product={product}
            tracking={tracking}
          />
        </div>

        <div className="product-media desktop-media" aria-hidden="true">
          {product.productImage ? (
            <Image
              src={product.productImage.src}
              alt=""
              width={product.productImage.width}
              height={product.productImage.height}
              sizes="48vw"
            />
          ) : (
            <span>◇</span>
          )}
        </div>
      </div>
    </div>
  );
}
