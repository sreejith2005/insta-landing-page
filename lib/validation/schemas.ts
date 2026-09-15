import { z } from "zod";

import { normalizeIndianPhone } from "@/lib/phone/normalize-indian-phone";

const safeText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(2, `${label} is required.`)
    .max(max, `${label} is too long.`)
    .regex(/^[^<>\u0000-\u001f]+$/, `Enter a valid ${label.toLowerCase()}.`);

const identifier = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);
const contextFields = {
  productId: identifier,
  reelId: identifier,
  campaignId: identifier,
};

export const incomingContextSchema = z.object(contextFields);

export const leadSubmissionSchema = z.object({
  fullName: safeText("Full name", 100),
  mobileNumber: z.string().trim().transform((value, context) => {
    try {
      return normalizeIndianPhone(value);
    } catch {
      context.addIssue({ code: "custom", message: "Enter a valid Indian mobile number." });
      return z.NEVER;
    }
  }),
  pinCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid six-digit PIN code."),
  city: safeText("City", 80),
  ...contextFields,
  sessionId: z.uuid(),
  idempotencyKey: z.string().trim().min(16).max(160).regex(/^[A-Za-z0-9:_-]+$/),
  landingPageVersion: identifier,
});

export const eventNames = [
  "landing_view",
  "product_context_resolved",
  "product_context_failed",
  "form_started",
  "form_validation_failed",
  "form_submitted",
  "repeat_customer_detected",
  "product_revealed",
  "calendly_opened",
  "store_visit_selected",
  "video_consultation_selected",
  "appointment_booked",
  "whatsapp_clicked",
  "callback_requested",
] as const;

export const eventSchema = z.object({
  eventName: z.enum(eventNames),
  sessionId: z.uuid(),
  inquiryId: z.string().max(80).optional(),
  customerId: z.string().max(80).optional(),
  ...contextFields,
  landingPageVersion: identifier,
  metadata: z.record(z.string(), z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
});

export const callbackSchema = z.object({
  inquiryId: z.string().min(1).max(80),
  sessionId: z.uuid(),
  idempotencyKey: z.string().min(16).max(160).regex(/^[A-Za-z0-9:_-]+$/),
});

export type LeadSubmissionInput = z.infer<typeof leadSubmissionSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type CallbackInput = z.infer<typeof callbackSchema>;
