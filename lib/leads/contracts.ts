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

/** The enquiry a booking was joined to. */
export type InquiryMatch = ProductMapping & {
  inquiryId: string;
  /** The customer-facing reference, e.g. "MK-2609-0042". Blank on inquiries logged before it was stored. */
  referenceNumber: string;
};

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
  attribution: InquiryMatch | null;
};

/** How a Calendly invitee is matched back to an enquiry. Phones are normalised Indian mobiles. */
export type InquiryContact = { email?: string; phones: readonly string[] };

/** An enquiry's store pass, as staff see it after a scan. */
export type PassRecord = {
  passCode: string;
  inquiryId: string;
  customerId: string;
  /** ISO 8601; the pass is valid for PASS_VALIDITY_DAYS from here. */
  issuedAt: string;
  customerName: string;
  phone: string;
  city: string;
  productId: string;
  productName: string;
  reelId: string;
  campaignId: string;
};

/** A row of the Stores tab. Store names double as their IDs. */
export type StoreRecord = { name: string; pin: string; active: boolean };

export type StoreVisitAction = "visited" | "purchased";

/** A row of the Store_Visits tab: one staff action on one pass. */
export type StoreVisitRecord = {
  createdAt: string;
  action: StoreVisitAction;
  store: string;
  staffName: string;
  passCode: string;
  customerName: string;
  phone: string;
  inquiryId: string;
  customerId: string;
  productId: string;
  reelId: string;
  campaignId: string;
  invoiceNumber: string;
  billAmount: string;
};

export type AcceptLeadOptions = {
  /** Stored on the new Inquiries row. Ignored on a replay, which keeps its own. */
  passCode?: string;
};

export interface FunnelRepository extends ProductRepository {
  acceptLead(
    input: LeadSubmissionInput,
    product: ResolvedAttributionContext,
    options?: AcceptLeadOptions,
  ): Promise<AcceptedLeadRecord & { wasReplay: boolean; passCode?: string; createdAt: string }>;
  recordEvent(input: EventInput): Promise<void>;
  countInquiriesForContext(filter: InquiryCountFilter): Promise<number>;
  /** The inquiry with this ID, if any. */
  findInquiryById(inquiryId: string): Promise<InquiryMatch | null>;
  /** The most recent inquiry matching the contact, if any. */
  findLatestInquiryByContact(contact: InquiryContact): Promise<InquiryMatch | null>;
  recordBooking(booking: BookingRecord): Promise<{ wasReplay: boolean }>;
  /** The enquiry that issued this pass code, if any. */
  findPassByCode(passCode: string): Promise<PassRecord | null>;
  listStores(): Promise<StoreRecord[]>;
  /** Every Store_Visits row for one customer, across all their passes. */
  listStoreVisits(customerId: string): Promise<StoreVisitRecord[]>;
  recordStoreVisit(visit: Omit<StoreVisitRecord, "createdAt">): Promise<StoreVisitRecord>;
}

/** The store pass handed to the customer after an accepted enquiry. */
export type IssuedPass = {
  code: string;
  /** Same-site path of the customer's pass page (also what the QR opens). */
  path: string;
  /** Same-site path of the QR image. */
  qrPath: string;
  /** ISO 8601. */
  validUntil: string;
};

export type SubmitLeadResult =
  | ({ ok: true; pass?: IssuedPass } & AcceptedLeadRecord)
  | {
      ok: false;
      code: "invalid_product" | "inactive_product" | "rejected" | "service_unavailable";
      message: string;
    };
