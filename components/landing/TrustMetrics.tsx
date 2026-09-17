"use client";

import { useEffect, useRef, useState } from "react";

import type { TrustMetric } from "@/config/social-proof";
import { PlaceholderTag } from "@/components/social-proof/PlaceholderTag";
import { prefersReducedMotion } from "./motion";

const NUMBER = /^(\D*?)(\d[\d,]*)(.*)$/;

/**
 * Counts an approved value up once when it scrolls into view. The server
 * renders the final approved text; animation only replays that same value.
 */
function MetricValue({ value }: { value: string }) {
  const ref = useRef<HTMLElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const node = ref.current;
    const match = value.match(NUMBER);
    if (!node || !match || typeof IntersectionObserver === "undefined" || prefersReducedMotion()) return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    const [, prefix, digits, suffix] = match;
    const target = Number(digits.replaceAll(",", ""));
    if (!Number.isFinite(target) || target < 2) return;
    const format = (n: number) => `${prefix}${digits.includes(",") ? n.toLocaleString("en-IN") : n}${suffix}`;
    // Resetting to zero must happen after measuring that the value is off-screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplay(format(0));
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (time: number) => {
        const progress = Math.min(1, (time - start) / 1100);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(progress === 1 ? value : format(Math.round(target * eased)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <strong ref={ref} aria-label={value}>
      <span aria-hidden="true">{display}</span>
    </strong>
  );
}

/** Static, approved company facts. Separate from the dynamic per-selection enquiry count. */
export function TrustMetrics({
  metrics,
  placeholder = false,
}: {
  metrics: readonly TrustMetric[];
  placeholder?: boolean;
}) {
  if (!metrics.length) return null;

  return (
    <section className="band band-white trust-band" aria-label="MK Jewels in numbers" data-placeholder={placeholder || undefined}>
      <div className="container container-wide">
        {placeholder ? <PlaceholderTag>trust metrics</PlaceholderTag> : null}
        <div className="trust-strip" data-count={Math.min(metrics.length, 4)}>
          {metrics.slice(0, 4).map((metric) => (
            <div className="trust-metric" key={`${metric.value}-${metric.label}`}>
              <MetricValue value={metric.value} />
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
