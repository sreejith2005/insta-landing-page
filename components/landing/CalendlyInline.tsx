"use client";

import Script from "next/script";
import { useCallback, useRef } from "react";

import { CALENDLY_WIDGET_SRC } from "@/lib/contact/calendly";

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
    // `resize: true` is Calendly's responsive mode: the embed follows the
    // container's width instead of its own 320px minimum, which is what keeps
    // a 360px viewport from scrolling sideways.
    window.Calendly.initInlineWidget({ url, parentElement: parent, resize: true });
  }, [url]);

  return (
    <>
      <Script src={CALENDLY_WIDGET_SRC} strategy="afterInteractive" onReady={mount} />
      <div ref={container} id={id} className="calendly-embed" role="region" aria-label={label} />
    </>
  );
}
