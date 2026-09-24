import { randomUUID } from "node:crypto";

import { previewProducts } from "@/data/preview-products";
import type {
  AcceptLeadOptions,
  BookingRecord,
  FunnelRepository,
  InquiryContact,
  InquiryCountFilter,
  InquiryMatch,
  StoreRecord,
  StoreVisitRecord,
} from "@/lib/leads/contracts";
import { createReferenceNumberSource } from "@/lib/leads/reference-number";
import type { ProductRecord } from "@/lib/products/contracts";
import type { EventInput, LeadSubmissionInput } from "@/lib/validation/schemas";
import type { ProductMapping, ReelMapping, ResolvedAttributionContext } from "@/types/funnel";

type Inquiry = LeadSubmissionInput & {
  productName: string;
  inquiryId: string;
  customerId: string;
  referenceNumber: string;
  createdAt: string;
  passCode?: string;
};

/** Local-only stores. Every PIN is 123456; never used with Google Sheets. */
export const previewStores: StoreRecord[] = [
  { name: "Bandra", pin: "123456", active: true },
  { name: "Zaveri Bazar", pin: "123456", active: true },
  { name: "Andheri", pin: "123456", active: true },
  { name: "Sindhu Bhavan Ahmedabad", pin: "123456", active: true },
  { name: "CG Road Ahmedabad", pin: "123456", active: true },
  { name: "Online / CRM", pin: "123456", active: true },
  { name: "Ulhasnagar", pin: "123456", active: false },
];

const match = (inquiry: Inquiry): InquiryMatch => ({
  inquiryId: inquiry.inquiryId,
  referenceNumber: inquiry.referenceNumber,
  productId: inquiry.productId,
  reelId: inquiry.reelId,
  campaignId: inquiry.campaignId,
});

export class PreviewRepository implements FunnelRepository {
  private readonly customers = new Map<string, string>();
  private readonly inquiries: Inquiry[] = [];
  private readonly idempotency = new Map<
    string,
    { inquiryId: string; customerId: string; isRepeatCustomer: boolean; passCode?: string; createdAt: string }
  >();
  private readonly events: EventInput[] = [];
  private readonly bookings: BookingRecord[] = [];
  private readonly storeVisits: StoreVisitRecord[] = [];
  private readonly referenceNumber = createReferenceNumberSource();

  constructor(
    private readonly options: { failWrites?: boolean; products?: ProductRecord[]; stores?: StoreRecord[] } = {},
  ) {}

  async findByContext(context: ProductMapping) {
    return (
      (this.options.products ?? previewProducts).find(
        (product) =>
          product.productId === context.productId &&
          product.reelId === context.reelId &&
          product.campaignId === context.campaignId,
      ) ?? null
    );
  }

  async findActiveByReel(context: ReelMapping) {
    return (this.options.products ?? previewProducts)
      .filter(
        (product) => product.active && product.reelId === context.reelId && product.campaignId === context.campaignId,
      )
      .sort(
        (a, b) => (a.productPosition ?? Number.POSITIVE_INFINITY) - (b.productPosition ?? Number.POSITIVE_INFINITY),
      );
  }

  async acceptLead(
    input: LeadSubmissionInput,
    { productName }: ResolvedAttributionContext,
    options: AcceptLeadOptions = {},
  ) {
    if (this.options.failWrites) throw new Error("preview write failure");
    const replay = this.idempotency.get(input.idempotencyKey);
    if (replay) return { ...replay, wasReplay: true };

    const existingCustomer = this.customers.get(input.mobileNumber);
    const customerId = existingCustomer ?? `cus_${randomUUID()}`;
    if (!existingCustomer) this.customers.set(input.mobileNumber, customerId);
    const result = {
      inquiryId: `inq_${randomUUID()}`,
      customerId,
      isRepeatCustomer: Boolean(existingCustomer),
      passCode: options.passCode,
      createdAt: new Date().toISOString(),
    };
    this.inquiries.push({
      ...input,
      productName,
      ...result,
      referenceNumber: await this.referenceNumber(),
    });
    this.idempotency.set(input.idempotencyKey, result);
    return { ...result, wasReplay: false };
  }

  async recordEvent(input: EventInput) {
    if (this.options.failWrites) throw new Error("preview write failure");
    this.events.push(structuredClone(input));
  }

  async countInquiriesForContext(filter: InquiryCountFilter) {
    const since = filter.since ? Date.parse(filter.since) : undefined;
    return this.inquiries.filter((inquiry) => {
      if (inquiry.productId !== filter.productId) return false;
      if (filter.reelId && inquiry.reelId !== filter.reelId) return false;
      if (filter.campaignId && inquiry.campaignId !== filter.campaignId) return false;
      if (since !== undefined && Date.parse(inquiry.createdAt) < since) return false;
      return true;
    }).length;
  }

  async findInquiryById(inquiryId: string) {
    const inquiry = this.inquiries.find((candidate) => candidate.inquiryId === inquiryId);
    return inquiry ? match(inquiry) : null;
  }

  /** Preview inquiries carry no email, so only phones match. Latest wins. */
  async findLatestInquiryByContact(contact: InquiryContact) {
    const inquiry = this.inquiries.findLast((candidate) => contact.phones.includes(candidate.mobileNumber));
    return inquiry ? match(inquiry) : null;
  }

  async recordBooking(booking: BookingRecord) {
    if (this.options.failWrites) throw new Error("preview write failure");
    if (this.bookings.some((existing) => existing.inviteeUri === booking.inviteeUri)) return { wasReplay: true };
    this.bookings.push(structuredClone(booking));
    return { wasReplay: false };
  }

  async findPassByCode(passCode: string) {
    const inquiry = this.inquiries.find((candidate) => candidate.passCode === passCode);
    if (!inquiry?.passCode) return null;
    return {
      passCode: inquiry.passCode,
      inquiryId: inquiry.inquiryId,
      customerId: inquiry.customerId,
      issuedAt: inquiry.createdAt,
      customerName: inquiry.fullName,
      phone: inquiry.mobileNumber,
      city: inquiry.city,
      productId: inquiry.productId,
      productName: inquiry.productName,
      reelId: inquiry.reelId,
      campaignId: inquiry.campaignId,
    };
  }

  async listStores() {
    return this.options.stores ?? previewStores;
  }

  async listStoreVisits(customerId: string) {
    return structuredClone(this.storeVisits.filter((visit) => visit.customerId === customerId));
  }

  async recordStoreVisit(visit: Omit<StoreVisitRecord, "createdAt">) {
    if (this.options.failWrites) throw new Error("preview write failure");
    const record = { ...visit, createdAt: new Date().toISOString() };
    this.storeVisits.push(record);
    return structuredClone(record);
  }

  snapshot() {
    return {
      customers: [...this.customers.entries()],
      inquiries: structuredClone(this.inquiries),
      events: structuredClone(this.events),
      bookings: structuredClone(this.bookings),
      storeVisits: structuredClone(this.storeVisits),
    };
  }
}
