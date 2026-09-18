import { randomUUID } from "node:crypto";

import { previewProducts } from "@/data/preview-products";
import type { BookingRecord, FunnelRepository, InquiryContact, InquiryCountFilter } from "@/lib/leads/contracts";
import type { ProductRecord } from "@/lib/products/contracts";
import type { EventInput, LeadSubmissionInput } from "@/lib/validation/schemas";
import type { ProductMapping, ResolvedAttributionContext } from "@/types/funnel";

type Inquiry = LeadSubmissionInput & {
  productName: string;
  inquiryId: string;
  customerId: string;
  createdAt: string;
};

export class PreviewRepository implements FunnelRepository {
  private readonly customers = new Map<string, string>();
  private readonly inquiries: Inquiry[] = [];
  private readonly idempotency = new Map<
    string,
    { inquiryId: string; customerId: string; isRepeatCustomer: boolean }
  >();
  private readonly events: EventInput[] = [];
  private readonly bookings: BookingRecord[] = [];

  constructor(private readonly options: { failWrites?: boolean; products?: ProductRecord[] } = {}) {}

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

  async acceptLead(input: LeadSubmissionInput, { productName }: ResolvedAttributionContext) {
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
    };
    this.inquiries.push({
      ...input,
      productName,
      ...result,
      createdAt: new Date().toISOString(),
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

  /** Preview inquiries carry no email, so only phones match. Latest wins. */
  async findLatestInquiryByContact(contact: InquiryContact) {
    const match = this.inquiries.findLast((inquiry) => contact.phones.includes(inquiry.mobileNumber));
    return match ? { productId: match.productId, reelId: match.reelId, campaignId: match.campaignId } : null;
  }

  async recordBooking(booking: BookingRecord) {
    if (this.options.failWrites) throw new Error("preview write failure");
    if (this.bookings.some((existing) => existing.inviteeUri === booking.inviteeUri)) return { wasReplay: true };
    this.bookings.push(structuredClone(booking));
    return { wasReplay: false };
  }

  snapshot() {
    return {
      customers: [...this.customers.entries()],
      inquiries: structuredClone(this.inquiries),
      events: structuredClone(this.events),
      bookings: structuredClone(this.bookings),
    };
  }
}
