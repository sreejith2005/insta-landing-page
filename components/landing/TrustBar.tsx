import { trustBarConfig } from "@/config/experience";
import { PlaceholderTag } from "@/components/social-proof/PlaceholderTag";
import type { InquiryProof, TrustBarContent } from "@/lib/social-proof/inquiry-proof";

/** Dynamic, per-selection enquiry count. Shown beside, never merged with, the static stats. */
function InquiryStat({ proof }: { proof: InquiryProof }) {
  const formatted = proof.count.toLocaleString("en-IN");
  const rest = proof.label.startsWith(formatted) ? proof.label.slice(formatted.length) : ` ${proof.label}`;
  return (
    <li className={`trust-bar-item trust-bar-inquiry${proof.live ? " is-live" : ""}`}>
      <span className="trust-bar-mark" aria-hidden="true" />
      <span>
        <strong>{formatted}</strong>
        {rest}
      </span>
      {proof.live ? <span className="live-badge">Live</span> : null}
    </li>
  );
}

/**
 * Slim bar at the very top of the page. Receives only content resolved on the
 * server: a real enquiry count and approved (or, outside production, labelled
 * placeholder) stats. Renders nothing when there is neither.
 */
export function TrustBar({ content }: { content: TrustBarContent | null }) {
  if (!content) return null;

  return (
    <aside className="trust-bar" aria-label={trustBarConfig.label} data-placeholder={content.placeholder || undefined}>
      {content.placeholder ? <PlaceholderTag>trust stats</PlaceholderTag> : null}
      <ul className="trust-bar-list">
        {content.inquiry ? <InquiryStat proof={content.inquiry} /> : null}
        {content.stats.map((stat) => (
          <li className="trust-bar-item" key={`${stat.value}-${stat.label}`}>
            <strong>{stat.value}</strong> {stat.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
