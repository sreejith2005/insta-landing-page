import type { ProductRepository } from "@/lib/products/contracts";
import type { EventInput, LeadSubmissionInput } from "@/lib/validation/schemas";
import type { PublicProductContext } from "@/types/funnel";

export type AcceptedLeadRecord = {
  inquiryId: string;
  customerId: string;
  isRepeatCustomer: boolean;
};

export type CallbackRecord = { callbackId: string; inquiryId: string };

export interface FunnelRepository extends ProductRepository {
  acceptLead(input: LeadSubmissionInput): Promise<AcceptedLeadRecord & { wasReplay: boolean }>;
  recordEvent(input: EventInput): Promise<void>;
  requestCallback(input: {
    inquiryId: string;
    sessionId: string;
    idempotencyKey: string;
  }): Promise<CallbackRecord | null>;
}

export type SubmitLeadResult =
  | ({ ok: true; product: PublicProductContext } & AcceptedLeadRecord)
  | {
      ok: false;
      code: "invalid_product" | "inactive_product" | "service_unavailable";
      message: string;
    };
