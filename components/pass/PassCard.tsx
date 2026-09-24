import { passConfig } from "@/config/pass";
import { formatPassDate } from "@/lib/passes/format";

export type PassCardState = "valid" | "used" | "expired";

/**
 * The customer's store pass: QR, code and validity on a white card, so it
 * scans cleanly and reads well in a screenshot. No product or personal detail
 * beyond a first name appears on it.
 */
export function PassCard({
  code,
  qrSrc,
  validUntil,
  firstName,
  state = "valid",
  note,
}: {
  code: string;
  qrSrc: string;
  /** ISO 8601. */
  validUntil: string;
  firstName?: string;
  state?: PassCardState;
  /** Extra line under the status, e.g. when and where a used pass was used. */
  note?: string;
}) {
  return (
    <article className={`pass-card is-${state}`} aria-label={passConfig.title}>
      <header className="pass-card-head">
        <p className="pass-card-title">{passConfig.title}</p>
        <p className="pass-card-benefit">{passConfig.benefit}</p>
        {firstName ? <p className="pass-card-name">For {firstName.split(/\s+/)[0]}</p> : null}
      </header>
      {state === "valid" ? (
        // eslint-disable-next-line @next/next/no-img-element -- a same-site SVG needs no optimisation
        <img className="pass-card-qr" src={qrSrc} alt={`QR code for store pass ${code}`} width={220} height={220} />
      ) : (
        <p className="pass-card-status" role="status">
          {state === "used" ? "This pass has been used" : "This pass has expired"}
          {note ? <span>{note}</span> : null}
        </p>
      )}
      <p className="pass-card-code">
        <span className="pass-card-code-label">Your code</span>
        <strong>{code}</strong>
      </p>
      <p className="pass-card-valid">
        {state === "expired" ? "Expired on" : "Valid till"} {formatPassDate(validUntil)}
      </p>
      {state === "valid" ? (
        <p className="pass-card-note">
          {passConfig.instructions} {passConfig.screenshotHint}
        </p>
      ) : null}
    </article>
  );
}
