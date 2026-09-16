import type { ExperienceDefaults, ProductRepository } from "@/lib/products/contracts";
import type {
  AppointmentInput,
  EventInput,
  LeadSubmissionInput,
} from "@/lib/validation/schemas";
import type { PublicProductContext } from "@/types/funnel";

export type AcceptedLeadRecord = {
  inquiryId: string;
  customerId: string;
  isRepeatCustomer: boolean;
};

export type CallbackRecord = { callbackId: string; inquiryId: string };

export type AppointmentRecord = { appointmentId: string; inquiryId: string };

/**
 * The single persistence port. Google Sheets is one implementation; swapping in
 * the MK Jewels FMS means implementing this interface only, with no frontend or
 * service changes.
 */
export interface FunnelRepository extends ProductRepository {
  acceptLead(input: LeadSubmissionInput): Promise<AcceptedLeadRecord & { wasReplay: boolean }>;
  recordEvent(input: EventInput): Promise<void>;
  requestCallback(input: {
    inquiryId: string;
    sessionId: string;
    idempotencyKey: string;
  }): Promise<CallbackRecord | null>;
  recordAppointment(input: AppointmentInput): Promise<AppointmentRecord | null>;
}

export type SubmitLeadOptions = { defaults?: ExperienceDefaults };

export type SubmitLeadResult =
  | ({ ok: true; product: PublicProductContext } & AcceptedLeadRecord)
  | {
      ok: false;
      code: "invalid_product" | "inactive_product" | "rejected" | "service_unavailable";
      message: string;
    };
