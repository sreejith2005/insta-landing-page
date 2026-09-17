"use client";

import { useRef, type ReactNode } from "react";

/**
 * A swipeable row on small screens and a grid on desktop. It never moves on its
 * own; previous/next buttons make it usable without dragging.
 */
export function ProofCarousel({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const track = useRef<HTMLUListElement>(null);

  function step(direction: 1 | -1) {
    const node = track.current;
    if (!node) return;
    const card = node.querySelector<HTMLElement>(":scope > li");
    const distance = card ? card.offsetWidth + 14 : node.clientWidth * 0.85;
    node.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  return (
    <div className={`proof-carousel ${className}`} role="region" aria-roledescription="carousel" aria-label={label}>
      <ul className="proof-track" ref={track} tabIndex={0}>
        {children}
      </ul>
      <div className="carousel-controls">
        <button type="button" onClick={() => step(-1)} aria-label={`Previous: ${label}`}>
          <span aria-hidden="true">←</span>
        </button>
        <button type="button" onClick={() => step(1)} aria-label={`Next: ${label}`}>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

export function Stars({ rating, className = "stars" }: { rating: number; className?: string }) {
  const rounded = Math.round(rating);
  return (
    <span className={className} role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true" className={index < rounded ? "on" : "off"}>★</span>
      ))}
    </span>
  );
}
