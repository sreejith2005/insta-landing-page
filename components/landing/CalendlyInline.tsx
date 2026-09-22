"use client";

import { useEffect, useRef, useState } from "react";

import { CALENDLY_ORIGIN, CALENDLY_WIDGET_SRC, schedulerUrl, type SchedulerBookingType } from "@/lib/contact/calendly";

type CalendlyWidget = {
  initInlineWidget(options: {
    url: string;
    parentElement: HTMLElement;
    /** Calendly's own fluid mode: the scheduler tracks the parent's width. */
    resize?: boolean;
  }): void;
};

declare global {
  interface Window {
    Calendly?: CalendlyWidget;
  }
}

/** Past this, the loader gives way even if Calendly never reported in. */
const LOADER_TIMEOUT_MS = 15_000;

let widgetLoading: Promise<CalendlyWidget> | undefined;

/**
 * widget.js, loaded once however many schedulers ask for it. (next/script's
 * `onReady` only reaches one of several instances mounted while the script is
 * still loading, which left the second scheduler blank.)
 */
function loadCalendlyWidget(): Promise<CalendlyWidget> {
  if (window.Calendly) return Promise.resolve(window.Calendly);
  widgetLoading ??= new Promise<CalendlyWidget>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CALENDLY_WIDGET_SRC;
    script.async = true;
    script.onload = () => (window.Calendly ? resolve(window.Calendly) : reject(new Error("Calendly widget missing")));
    script.onerror = () => {
      widgetLoading = undefined;
      script.remove();
      reject(new Error("Calendly widget failed to load"));
    };
    document.head.append(script);
  });
  return widgetLoading;
}

/**
 * Calendly's inline embed. The container deliberately lacks the
 * `calendly-inline-widget` class so widget.js does not auto-initialise it as
 * well. The inquiry ID and booking choice ride along as UTM parameters, which
 * Calendly hands back in the webhook.
 *
 * widget.js's own spinner needs Calendly's stylesheet, which is not loaded, so
 * the page shows its own loader until this scheduler's iframe posts its first
 * `calendly.*` message.
 */
export function CalendlyInline({
  url,
  inquiryId,
  bookingType,
}: {
  url: string;
  inquiryId?: string;
  bookingType?: SchedulerBookingType;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function mount(widget: CalendlyWidget) {
      const parent = container.current;
      if (cancelled || !parent) return;
      parent.replaceChildren();
      // `resize: true` is Calendly's responsive mode: the embed follows the
      // container's width instead of its own 320px minimum, which is what
      // keeps a 360px viewport from scrolling sideways.
      widget.initInlineWidget({
        url: schedulerUrl(url, { inquiryId, bookingType }),
        parentElement: parent,
        resize: true,
      });
    }
    // Already loaded: mount straight away, without waiting a tick.
    if (window.Calendly) mount(window.Calendly);
    else loadCalendlyWidget().then(mount, () => setReady(true));
    return () => {
      cancelled = true;
    };
  }, [url, inquiryId, bookingType]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== CALENDLY_ORIGIN) return;
      const frame = container.current?.querySelector("iframe");
      if (!frame || event.source !== frame.contentWindow) return;
      const name = (event.data as { event?: unknown } | null)?.event;
      if (typeof name === "string" && name.startsWith("calendly.")) setReady(true);
    }
    window.addEventListener("message", onMessage);
    const fallback = window.setTimeout(() => setReady(true), LOADER_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div className="calendly-frame" data-ready={ready || undefined}>
      <div ref={container} className="calendly-embed" />
      {ready ? null : (
        <div className="calendly-loader" role="status">
          <span className="calendly-loader-ring" aria-hidden="true" />
          <span>Loading available times…</span>
        </div>
      )}
    </div>
  );
}
