import type { ProductRepository } from "@/lib/products/contracts";
import type { EventInput, LeadSubmissionInput } from "@/lib/validation/schemas";

export type AcceptedLeadRecord = {
  inquiryId: string;
  customerId: string;
  isRepeatCustomer: boolean;
};

export type InquiryCountFilter = {
  productId: string;
  reelId?: string;
  campaignId?: string;
  since?: string;
};

export interface FunnelRepository extends ProductRepository {
  acceptLead(
    input: LeadSubmissionInput,
    productName: string,
  ): Promise<AcceptedLeadRecord & { wasReplay: boolean }>;
  recordEvent(input: EventInput): Promise<void>;
  countInquiriesForContext(filter: InquiryCountFilter): Promise<number>;
}

export type SubmitLeadResult =
  | ({ ok: true } & AcceptedLeadRecord)
  | {
      ok: false;
      code: "invalid_product" | "inactive_product" | "rejected" | "service_unavailable";
      message: string;
    };
