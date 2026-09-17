import { z } from "zod";

import { normalizeIndianPhone } from "@/lib/phone/normalize-indian-phone";
import { checkSafeText, fieldMessages, PIN_CODE } from "./lead-fields";

/** Shares its rules with the browser via `./lead-fields`, which has no deps. */
const safeText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .superRefine((value, context) => {
      const message = checkSafeText(value, label, max);
      if (message) context.addIssue({ code: "custom", message });
    });

const identifier = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);

/** Only approved entry points are accepted; anything else is rejected outright. */
export const funnelSources = ["instagram", "manychat", "whatsapp", "direct"] as const;
const sourceSchema = z.enum(funnelSources).default("instagram");

/**
 * UTM values arrive from the URL, so they are bounded and character-restricted
 * before they are ever persisted or echoed back.
 */
// `.optional()` must come last so the key stays optional on the parsed type;
// putting it before `.transform()` makes every UTM field required.
const utmValue = z
  .string()
  .trim()
  .max(120)
  .regex(/^[A-Za-z0-9 _.+%:|-]*$/)
  .transform((value) => (value ? value : undefined))
  .optional();

const utmFields = {
  utmSource: utmValue,
  utmMedium: utmValue,
  utmCampaign: utmValue,
  utmContent: utmValue,
  utmTerm: utmValue,
};

const contextFields = {
  productId: identifier,
  reelId: identifier,
  campaignId: identifier,
};

const attributionFields = {
  ...contextFields,
  source: sourceSchema,
  ...utmFields,
};

export const incomingContextSchema = z.object(attributionFields);

/**
 * Client-built replay key. The lead key embeds the session UUID plus the full
 * product/Reel/campaign triple, so the bound allows three maximum-length
 * identifiers rather than one.
 */
const idempotencyKey = z
  .string()
  .trim()
  .min(16)
  .max(300)
  .regex(/^[A-Za-z0-9:_-]+$/);

export const leadSubmissionSchema = z.object({
  fullName: safeText("Full name", 100),
  mobileNumber: z
    .string()
    .trim()
    .transform((value, context) => {
      try {
        return normalizeIndianPhone(value);
      } catch {
        context.addIssue({ code: "custom", message: fieldMessages.mobileNumber });
        return z.NEVER;
      }
    }),
  pinCode: z.string().trim().regex(PIN_CODE, fieldMessages.pinCode),
  city: safeText("City", 80),
  ...attributionFields,
  sessionId: z.uuid(),
  idempotencyKey,
  landingPageVersion: identifier,
  /** Honeypot: real customers never see or fill this control. */
  company: z.string().max(0).optional(),
  /** Milliseconds between form render and submission, used for bot heuristics. */
  elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
});

export const eventNames = [
  "landing_view",
  "context_resolved",
  "context_failed",
  "form_started",
  "form_validation_failed",
  "form_submitted",
  "repeat_customer_detected",
  "offer_unlocked",
] as const;

export const eventSchema = z.object({
  eventName: z.enum(eventNames),
  sessionId: z.uuid(),
  inquiryId: z.string().max(80).optional(),
  customerId: z.string().max(80).optional(),
  ...attributionFields,
  landingPageVersion: identifier,
  metadata: z.record(z.string(), z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
});

export type LeadSubmissionInput = z.infer<typeof leadSubmissionSchema>;
export type EventInput = z.infer<typeof eventSchema>;
