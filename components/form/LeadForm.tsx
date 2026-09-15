"use client";

import { useRef, useState } from "react";

import { experienceCopy, leadFields } from "@/config/experience";
import { getSessionId } from "@/lib/attribution/session";
import { trackFunnelEvent } from "@/lib/attribution/client-events";
import { leadSubmissionSchema } from "@/lib/validation/schemas";
import type { AcceptedInquiry, IncomingInstagramContext, LeadFields } from "@/types/funnel";
import { LeadField } from "./LeadField";

type Props = {
  context: IncomingInstagramContext;
  onAccepted: (accepted: AcceptedInquiry, sessionId: string) => void;
};

const initialFields: LeadFields = { fullName: "", mobileNumber: "", pinCode: "", city: "" };

export function LeadForm({ context, onAccepted }: Props) {
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFields, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [formError, setFormError] = useState("");
  const started = useRef(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    const sessionId = getSessionId();
    const payload = {
      ...fields,
      ...context,
      sessionId,
      idempotencyKey: `lead:${sessionId}:${context.productId}`,
      landingPageVersion: "phase1",
    };
    const parsed = leadSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof LeadFields, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof LeadFields;
        if (key in fields && !nextErrors[key]) {
          nextErrors[key] = key === "fullName" ? "Enter your full name." : issue.message;
        }
      }
      setErrors(nextErrors);
      if (sessionId) void trackFunnelEvent("form_validation_failed", { sessionId, ...context, landingPageVersion: "phase1" });
      return;
    }

    setStatus("submitting");
    setFormError("");
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message);
      onAccepted(result as AcceptedInquiry & { ok: true }, sessionId);
    } catch {
      setFormError("We could not save your details. Please try again.");
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
                const sessionId = getSessionId();
                void trackFunnelEvent("form_started", { sessionId, ...context, landingPageVersion: "phase1" });
              }
              setFields((current) => ({ ...current, [field.name]: event.target.value }));
              setErrors((current) => ({ ...current, [field.name]: undefined }));
            }}
          />
        ))}
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
