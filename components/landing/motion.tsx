"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

export const FORM_SECTION_ID = "enquire";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Fades a block in once as it enters the viewport. Content renders visible on
 * the server and without IntersectionObserver; only blocks that start below the
 * fold are hidden, so nothing above the fold ever flashes.
 */
export function Reveal({
  as: Tag = "div",
  className,
  children,
  delay = 0,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  delay?: number;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"static" | "pending" | "shown">("static");

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined" || prefersReducedMotion()) return;
    if (node.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    // Hiding below-the-fold content must follow a real layout measurement.
    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={[className, "reveal"].filter(Boolean).join(" ")}
      data-reveal={state}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Smooth-scrolls to the single lead form and moves focus to its first field. */
export function scrollToLeadForm() {
  const section = document.getElementById(FORM_SECTION_ID);
  if (!section) return;
  section.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  const input = section.querySelector<HTMLInputElement>("input:not([tabindex='-1'])");
  input?.focus({ preventScroll: true });
}

/**
 * In-page call to action. It is a link to the form (so it works without JS and
 * is announced as navigation), enhanced to smooth-scroll and focus the form.
 */
export function ScrollCta({
  children,
  className = "cta-link",
  source,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  source: string;
} & Record<string, unknown>) {
  return (
    <a
      href={`#${FORM_SECTION_ID}`}
      className={className}
      data-cta={source}
      onClick={(event) => {
        event.preventDefault();
        scrollToLeadForm();
      }}
      {...rest}
    >
      <span>{children}</span>
      <span className="cta-arrow" aria-hidden="true">→</span>
    </a>
  );
}
