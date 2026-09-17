import type { ReactNode } from "react";

/** Visible marker on every development placeholder section. Never rendered in production. */
export function PlaceholderTag({ children }: { children: ReactNode }) {
  return (
    <p className="dev-tag">
      Development placeholder · not approved for production · {children}
    </p>
  );
}
