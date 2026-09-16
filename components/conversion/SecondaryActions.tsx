"use client";

import { useState } from "react";

import { trackFunnelEvent, type TrackingContext } from "@/lib/attribution/client-events";
import { buildWhatsappUrl } from "@/lib/conversion/whatsapp";
import type { PublicProductContext } from "@/types/funnel";

type Props = {
  inquiryId: string;
  sessionId: string;
  product: PublicProductContext;
  tracking: TrackingContext;
};

export function SecondaryActions({ inquiryId, sessionId, product, tracking }: Props) {
  const [callbackStatus, setCallbackStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const { whatsappEnabled, callbackEnabled } = product.ctas;
  const whatsappNumber = product.whatsapp.number;
  const whatsappUrl = whatsappNumber
    ? buildWhatsappUrl(whatsappNumber, product.whatsapp.messageTemplate, {
        productId: product.productId,
        productName: product.productName,
        inquiryId,
      })
    : undefined;

  async function callback() {
    if (callbackStatus === "saving" || callbackStatus === "saved") return;
    setCallbackStatus("saving");
    try {
      const response = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId,
          sessionId,
          idempotencyKey: `callback:${sessionId}:${inquiryId}`,
        }),
      });
      if (!response.ok) throw new Error("callback failed");
      setCallbackStatus("saved");
      void trackFunnelEvent("callback_requested", tracking);
    } catch {
      setCallbackStatus("failed");
    }
  }

  return (
    <div className="secondary-actions">
      {whatsappEnabled && whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => void trackFunnelEvent("whatsapp_clicked", tracking)}
        >
          Continue on WhatsApp
        </a>
      ) : whatsappEnabled ? (
        <span className="disabled-action" aria-disabled="true">
          Continue on WhatsApp
        </span>
      ) : null}

      {callbackEnabled ? (
        <button
          type="button"
          onClick={callback}
          disabled={callbackStatus === "saving" || callbackStatus === "saved"}
        >
          {callbackStatus === "saving"
            ? "Requesting…"
            : callbackStatus === "saved"
              ? "Callback requested"
              : "Request a Callback"}
        </button>
      ) : null}

      {callbackStatus === "saved" ? (
        <p role="status">Our team will contact you about this enquiry.</p>
      ) : null}
      {callbackStatus === "failed" ? (
        <p role="alert">We could not request a callback. Please try again.</p>
      ) : null}
    </div>
  );
}
