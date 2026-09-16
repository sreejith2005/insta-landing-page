"use client";

import { useEffect, useRef, useState } from "react";

import { experienceCopy, honeypotField, leadFields } from "@/config/experience";
import { getSessionId } from "@/lib/attribution/session";
import { trackFunnelEvent } from "@/lib/attribution/client-events";
import { validateLeadFields } from "@/lib/validation/lead-fields";
import type { AcceptedInquiry, IncomingInstagramContext, LeadFields } from "@/types/funnel";
import { LeadField } from "./LeadField";

type Props = {
  context: IncomingInstagramContext;
  landingPageVersion?: string;
  onAccepted: (accepted: AcceptedInquiry, sessionId: string) => void;
};

const initialFields: LeadFields = { fullName: "", mobileNumber: "", pinCode: "", city: "" };

const GENERIC_FAILURE = "We could not save your details. Please try again.";

export function LeadForm({ context, landingPageVersion = "phase1", onAccepted }: Props) {
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFields, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [formError, setFormError] = useState("");

  /** Applies the authoritative per-field errors returned by the server. */
  function setFieldErrorsFromServer(serverFields: unknown) {
    if (!serverFields || typeof serverFields !== "object") return;
    const next: Partial<Record<keyof LeadFields, string>> = {};
    for (const [key, messages] of Object.entries(serverFields as Record<string, unknown>)) {
      if (key in initialFields && Array.isArray(messages) && typeof messages[0] === "string") {
        next[key as keyof LeadFields] = messages[0];
      }
    }
    if (Object.keys(next).length) setErrors(next);
  }
  const started = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);
  // Recorded in an effect: reading the clock during render is impure.
  const mountedAt = useRef(0);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    const sessionId = getSessionId();
    const payload = {
      ...fields,
      ...context,
      sessionId,
      // Scoped to the session and the full product/Reel/campaign triple, so a
      // repeat tap cannot duplicate an inquiry while the same piece arriving
      // from a different Reel or campaign still records its own attribution.
      idempotencyKey: `lead:${sessionId}:${context.productId}:${context.reelId}:${context.campaignId}`,
      landingPageVersion,
      company: honeypot.current?.value ?? "",
      elapsedMs: mountedAt.current ? Date.now() - mountedAt.current : undefined,
    };
    // UX-only pass over the four customer-entered fields. The server revalidates
    // the whole payload and stays authoritative.
    const nextErrors = validateLeadFields(fields);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      if (sessionId) {
        void trackFunnelEvent("form_validation_failed", {
          sessionId,
          ...context,
          landingPageVersion,
        });
      }
      return;
    }

    setStatus("submitting");
    setFormError("");
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        // Every server message is deliberately generic and customer-safe, so
        // showing it beats a blanket failure — a rate-limited customer is told
        // to wait rather than to retry immediately.
        setFieldErrorsFromServer(result.fields);
        setFormError(
          typeof result.message === "string" && result.message
            ? result.message
            : GENERIC_FAILURE,
        );
        return;
      }
      onAccepted(result as AcceptedInquiry & { ok: true }, sessionId);
    } catch {
      setFormError(GENERIC_FAILURE);
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit} noValidate>
      <div className="fields">
        {leadFields.map((field) => (
          <LeadField
            key={field.name}
            id={field.name}
            name={field.name}
            label={field.label}
            autoComplete={field.autoComplete}
            inputMode={field.inputMode}
            placeholder={field.placeholder}
            value={fields[field.name]}
            error={errors[field.name]}
            onChange={(event) => {
              if (!started.current) {
                started.current = true;
                void trackFunnelEvent("form_started", {
                  sessionId: getSessionId(),
                  ...context,
                  landingPageVersion,
                });
              }
              setFields((current) => ({ ...current, [field.name]: event.target.value }));
              setErrors((current) => ({ ...current, [field.name]: undefined }));
            }}
          />
        ))}
      </div>
      {/* Honeypot: removed from the tab order and the accessibility tree. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor={honeypotField}>Company</label>
        <input
          ref={honeypot}
          id={honeypotField}
          name={honeypotField}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <button className="primary-button" disabled={status === "submitting"} type="submit">
        {status === "submitting" ? "Saving your details" : experienceCopy.submit}
        <span aria-hidden="true">→</span>
      </button>
      <p className="privacy-copy">{experienceCopy.privacy}</p>
    </form>
  );
}
