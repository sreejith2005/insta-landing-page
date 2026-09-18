"use client";

import Script from "next/script";
import { useCallback, useRef } from "react";

import { CALENDLY_WIDGET_SRC } from "@/lib/contact/calendly";

type CalendlyWidget = {
  initInlineWidget(options: { url: string; parentElement: HTMLElement }): void;
};

declare global {
  interface Window {
    Calendly?: CalendlyWidget;
  }
}

/**
 * Calendly's inline embed. The container deliberately lacks the
 * `calendly-inline-widget` class so widget.js does not auto-initialise it as
 * well; `onReady` runs on first load and on every later mount.
 */
export function CalendlyInline({ url, id, label }: { url: string; id: string; label: string }) {
  const container = useRef<HTMLDivElement>(null);

  const mount = useCallback(() => {
    const parent = container.current;
    if (!parent || !window.Calendly) return;
    parent.replaceChildren();
    window.Calendly.initInlineWidget({ url, parentElement: parent });
  }, [url]);

  return (
    <>
      <Script src={CALENDLY_WIDGET_SRC} strategy="afterInteractive" onReady={mount} />
      <div ref={container} id={id} className="calendly-embed" role="region" aria-label={label} />
    </>
  );
}
