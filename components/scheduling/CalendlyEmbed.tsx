"use client";

import { useEffect, useRef, useState } from "react";

import type { AppointmentType, UtmAttribution } from "@/types/funnel";

const WIDGET_SCRIPT = "https://assets.calendly.com/assets/external/widget.js";
const CALENDLY_ORIGIN = "https://calendly.com";
const LOAD_TIMEOUT_MS = 8000;

type CalendlyPrefill = { name?: string };
type CalendlyUtm = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

type CalendlyApi = {
  initInlineWidget(options: {
    url: string;
    parentElement: HTMLElement;
    prefill?: CalendlyPrefill;
    utm?: CalendlyUtm;
    resize?: boolean;
  }): void;
};

declare global {
  interface Window {
    Calendly?: CalendlyApi;
  }
}

/** Resolves once widget.js is available, or rejects if it cannot be loaded. */
function loadWidgetScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Calendly) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_SCRIPT}"]`);
  const script = existing ?? document.createElement("script");

  const ready = new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("calendly timeout")), LOAD_TIMEOUT_MS);
    script.addEventListener("load", () => {
      window.clearTimeout(timer);
      if (window.Calendly) resolve();
      else reject(new Error("calendly unavailable"));
    });
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      reject(new Error("calendly blocked"));
    });
  });

  if (!existing) {
    script.src = WIDGET_SCRIPT;
    script.async = true;
    document.head.appendChild(script);
  }
  return ready;
}

export type CalendlyBooking = { eventUri?: string; inviteeUri?: string };

type Props = {
  url: string;
  appointmentType: AppointmentType;
  /** Forwarded to Calendly so the Reel/campaign chain survives the booking. */
  attribution: UtmAttribution & { source: string; campaignId: string; productId: string; reelId: string };
  onOpened?: () => void;
  onBooked?: (booking: CalendlyBooking) => void;
};

export function CalendlyEmbed({ url, appointmentType, attribution, onOpened, onBooked }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const opened = useRef(false);
  const booked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const parent = container.current;
    if (!parent) return;

    parent.innerHTML = "";
    setState("loading");
    opened.current = false;
    booked.current = false;

    loadWidgetScript()
      .then(() => {
        if (cancelled || !window.Calendly) return;
        window.Calendly.initInlineWidget({
          url,
          parentElement: parent,
          utm: {
            utmSource: attribution.utmSource ?? attribution.source,
            utmMedium: attribution.utmMedium ?? attribution.reelId,
            utmCampaign: attribution.utmCampaign ?? attribution.campaignId,
            utmContent: attribution.utmContent ?? attribution.productId,
            utmTerm: attribution.utmTerm,
          },
          resize: true,
        });
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [url, attribution]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // Only Calendly's own origin may drive booking attribution.
      if (event.origin !== CALENDLY_ORIGIN) return;
      const data = event.data as { event?: string; payload?: Record<string, { uri?: string }> };
      if (typeof data?.event !== "string" || !data.event.startsWith("calendly.")) return;

      if (data.event === "calendly.event_type_viewed" && !opened.current) {
        opened.current = true;
        onOpened?.();
      }
      if (data.event === "calendly.event_scheduled" && !booked.current) {
        booked.current = true;
        onBooked?.({
          eventUri: data.payload?.event?.uri,
          inviteeUri: data.payload?.invitee?.uri,
        });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onOpened, onBooked]);

  const label = appointmentType === "store_visit" ? "Store visit" : "Video consultation";

  return (
    <div className="calendly-embed">
      {state === "failed" ? (
        <div className="calendly-fallback">
          <p>Online scheduling could not load here.</p>
          <a className="fallback-link" href={url} target="_blank" rel="noreferrer">
            Open {label.toLowerCase()} scheduling
          </a>
        </div>
      ) : (
        <>
          {state === "loading" ? (
            <p className="calendly-status" role="status">
              Loading {label.toLowerCase()} availability…
            </p>
          ) : null}
          <div
            className="calendly-inline"
            data-state={state}
            ref={container}
            aria-label={`${label} scheduling`}
          />
          <a className="fallback-link" href={url} target="_blank" rel="noreferrer">
            Open scheduling in a new window
          </a>
        </>
      )}
    </div>
  );
}
