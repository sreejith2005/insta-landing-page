"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { getSessionId } from "@/lib/attribution/session";
import { trackFunnelEvent, type TrackingContext } from "@/lib/attribution/client-events";
import type { ProductChoice } from "@/lib/products/contracts";

export type PickerOption = ProductChoice & {
  /** The same landing link with this product added; the server re-verifies it. */
  href: string;
};

/**
 * Shown only for a Reel-level link whose Reel maps to more than one active
 * product. Choosing one reloads the page through the exact product path, so
 * the rest of the funnel never knows a picker was involved.
 */
export function ProductPicker({
  options,
  context,
}: {
  options: PickerOption[];
  /** No product yet, so the picker events carry the Reel and campaign alone. */
  context: Omit<TrackingContext, "sessionId" | "productId" | "inquiryId" | "customerId">;
}) {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    void trackFunnelEvent("product_picker_shown", { sessionId: getSessionId(), ...context });
  }, [context]);

  return (
    <main className="product-picker" aria-labelledby="picker-heading">
      <h1 id="picker-heading">Which piece were you asking about?</h1>
      <ul className="picker-grid">
        {options.map((option) => (
          <li key={option.productId}>
            <Link
              className="picker-option"
              href={option.href}
              prefetch={false}
              onClick={() => {
                void trackFunnelEvent("product_picker_selected", {
                  sessionId: getSessionId(),
                  ...context,
                  productId: option.productId,
                });
              }}
            >
              <span className="picker-name">{option.productName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
