import { BrandHeader } from "@/components/brand/BrandHeader";

const copy = {
  missing: ["We could not find this selection", "Please return to your Instagram conversation and use the latest private link."],
  invalid: ["This selection link could not be verified", "For your privacy, please return to Instagram and request a new private link."],
  inactive: ["This piece is currently unavailable", "Our team can help you explore a suitable alternative."],
} as const;

/**
 * Recovery state for any context the Product Master cannot resolve. No product
 * is ever invented here; when `ASSISTED_SUPPORT_URL` is configured the customer
 * is routed to assisted support instead of being left at a dead end.
 */
export function ContextState({
  status,
  supportUrl,
}: {
  status: keyof typeof copy;
  supportUrl?: string;
}) {
  return (
    <div className="shell">
      <BrandHeader />
      <main className="context-state">
        <p className="state-mark" aria-hidden="true">◇</p>
        <h1>{copy[status][0]}</h1>
        <p>{copy[status][1]}</p>
        {supportUrl ? (
          <a className="support-link" href={supportUrl} target="_blank" rel="noreferrer">
            Speak to a jewellery expert
          </a>
        ) : null}
      </main>
    </div>
  );
}
