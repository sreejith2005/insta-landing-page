import type { ProductRepository } from "@/lib/products/contracts";
import type { ProductMapping, ResolvedAttributionContext } from "@/types/funnel";
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

/** Inferred from the Calendly event type; "unknown" when it matches neither configured list. */
export type BookingType = "video_call" | "store_visit" | "unknown";

/** A confirmed Calendly booking, as logged to the Bookings tab. */
export type BookingRecord = {
  bookingType: BookingType;
  /** ISO 8601, as sent by Calendly. */
  scheduledStart: string;
  scheduledEnd: string;
  inviteeName: string;
  inviteeEmail: string;
  /** Calendly's invitee URI. Unique per booking, so it makes webhook retries idempotent. */
  inviteeUri: string;
  /** The enquiry this booking was joined to, or null when no inquiry matched. */
  attribution: ProductMapping | null;
};

/** How a Calendly invitee is matched back to an enquiry. Phones are normalised Indian mobiles. */
export type InquiryContact = { email?: string; phones: readonly string[] };

export interface FunnelRepository extends ProductRepository {
  acceptLead(
    input: LeadSubmissionInput,
    product: ResolvedAttributionContext,
  ): Promise<AcceptedLeadRecord & { wasReplay: boolean }>;
  recordEvent(input: EventInput): Promise<void>;
  countInquiriesForContext(filter: InquiryCountFilter): Promise<number>;
  /** Product/Reel/campaign of the most recent inquiry matching the contact, if any. */
  findLatestInquiryByContact(contact: InquiryContact): Promise<ProductMapping | null>;
  recordBooking(booking: BookingRecord): Promise<{ wasReplay: boolean }>;
}

export type SubmitLeadResult =
  | ({ ok: true } & AcceptedLeadRecord)
  | {
      ok: false;
      code: "invalid_product" | "inactive_product" | "rejected" | "service_unavailable";
      message: string;
    };
