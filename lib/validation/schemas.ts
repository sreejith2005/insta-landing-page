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

/**
 * Forwarded by ManyChat from the DM thread (`?u=` / `?dm_ts=`); never
 * customer-entered. Kept out of `attributionFields` so it never reaches the
 * Events tab.
 */
const dmFields = {
  instagramUsername: safeText("Instagram username", 60).optional(),
  dmReceivedAt: z.iso.datetime({ offset: true }).optional(),
};

export const incomingContextSchema = z.object({
  ...attributionFields,
  // Absent on a Reel-level link: resolution then offers the Reel's active
  // products, and a picked product comes back through the exact-match path.
  productId: contextFields.productId.optional(),
  // A malformed handle or timestamp is dropped rather than costing the customer
  // the whole landing context.
  instagramUsername: dmFields.instagramUsername.catch(undefined),
  dmReceivedAt: dmFields.dmReceivedAt.catch(undefined),
});

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
  /**
   * Hidden PIN-autofill value from the browser. Advisory only: `submitLead`
   * re-resolves the state from the PIN and uses this only if that lookup fails.
   */
  state: safeText("State", 60).optional(),
  ...attributionFields,
  ...dmFields,
  sessionId: z.uuid(),
  idempotencyKey,
  landingPageVersion: identifier,
  /**
   * Honeypot value. Accepted here and judged in `submitLead`, so a filled trap
   * is a bot rejection rather than a confusing "check your details" error.
   */
  company: z.string().max(500).optional(),
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
  // Post-enquiry actions. The Calendly ones are browser signals only: they say
  // *that* a slot was picked or booked, never *when* (see the Calendly webhook).
  "calendly_video_call_opened",
  "calendly_store_visit_opened",
  "calendly_date_time_selected",
  "calendly_event_scheduled",
  "whatsapp_contact_clicked",
  // Reel-level links whose Reel maps to several active products.
  "product_picker_shown",
  "product_picker_selected",
] as const;

/** Fired before any product is chosen, so the only event allowed to omit `productId`. */
const productlessEvents = new Set<(typeof eventNames)[number]>(["product_picker_shown"]);

export const eventSchema = z
  .object({
    eventName: z.enum(eventNames),
    sessionId: z.uuid(),
    inquiryId: z.string().max(80).optional(),
    customerId: z.string().max(80).optional(),
    ...attributionFields,
    productId: contextFields.productId.optional(),
    landingPageVersion: identifier,
    metadata: z.record(z.string(), z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
  })
  .refine((event) => event.productId !== undefined || productlessEvents.has(event.eventName), {
    path: ["productId"],
    message: "productId is required for this event",
  });

export type LeadSubmissionInput = z.infer<typeof leadSubmissionSchema>;
export type EventInput = z.infer<typeof eventSchema>;

/** Any signed Calendly webhook. Only `invitee.created` is acted on. */
export const calendlyWebhookSchema = z.object({
  event: z.string().max(80),
});

const calendlyTimestamp = z.iso.datetime({ offset: true });

/**
 * The parts of Calendly's `invitee.created` payload the Bookings tab needs.
 * Unlisted fields are stripped; text is bounded before it reaches the sheet.
 */
export const calendlyInviteeCreatedSchema = z.object({
  event: z.literal("invitee.created"),
  payload: z.object({
    uri: z.string().trim().min(1).max(300),
    email: z.email().max(254),
    name: z.string().trim().max(200),
    /** Present only when the event type collects an SMS reminder number. */
    text_reminder_number: z.string().max(40).nullish(),
    questions_and_answers: z
      .array(z.object({ question: z.string().max(1000), answer: z.string().max(2000) }))
      .max(30)
      .nullish(),
    /**
     * The scheduling link's `utm_*` parameters. The embed sets `utm_content` to
     * the inquiry ID and `utm_term` to the booking choice; bookings made
     * outside the funnel send nulls. A malformed value is dropped (and the
     * booking joined by phone) rather than rejected.
     */
    tracking: z
      .object({ utm_content: z.string().max(200).nullish(), utm_term: z.string().max(200).nullish() })
      .nullish()
      .catch(null),
    scheduled_event: z.object({
      start_time: calendlyTimestamp,
      end_time: calendlyTimestamp,
      event_type: z.string().trim().max(300),
    }),
  }),
});

export type CalendlyInviteeCreated = z.infer<typeof calendlyInviteeCreatedSchema>;
