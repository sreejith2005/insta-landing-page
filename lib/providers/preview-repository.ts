import { randomUUID } from "node:crypto";

import { previewProducts } from "@/data/preview-products";
import type { AppointmentRecord, FunnelRepository } from "@/lib/leads/contracts";
import type { ProductRecord } from "@/lib/products/contracts";
import type {
  AppointmentInput,
  EventInput,
  LeadSubmissionInput,
} from "@/lib/validation/schemas";
import type { ProductMapping } from "@/types/funnel";

type Inquiry = LeadSubmissionInput & {
  inquiryId: string;
  customerId: string;
  createdAt: string;
};

/**
 * In-process store for local development and automated tests only. It is never
 * production storage and `lib/config/env.ts` refuses to select it in production.
 */
export class PreviewRepository implements FunnelRepository {
  private readonly customers = new Map<string, string>();
  private readonly inquiries: Inquiry[] = [];
  private readonly idempotency = new Map<
    string,
    { inquiryId: string; customerId: string; isRepeatCustomer: boolean }
  >();
  private readonly events: EventInput[] = [];
  private readonly callbacks: Array<{ callbackId: string; inquiryId: string; idempotencyKey: string }> = [];
  private readonly appointments: Array<AppointmentRecord & { idempotencyKey: string; appointmentType: string }> = [];

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

  async acceptLead(input: LeadSubmissionInput) {
    if (this.options.failWrites) throw new Error("preview write failure");
    const replay = this.idempotency.get(input.idempotencyKey);
    if (replay) return { ...replay, wasReplay: true };

    // The normalized phone number is the only customer matching key.
    const existingCustomer = this.customers.get(input.mobileNumber);
    const customerId = existingCustomer ?? `cus_${randomUUID()}`;
    if (!existingCustomer) this.customers.set(input.mobileNumber, customerId);
    const result = {
      inquiryId: `inq_${randomUUID()}`,
      customerId,
      isRepeatCustomer: Boolean(existingCustomer),
    };
    this.inquiries.push({ ...input, ...result, createdAt: new Date().toISOString() });
    this.idempotency.set(input.idempotencyKey, result);
    return { ...result, wasReplay: false };
  }

  async recordEvent(input: EventInput) {
    if (this.options.failWrites) throw new Error("preview write failure");
    this.events.push(structuredClone(input));
  }

  async requestCallback(input: { inquiryId: string; sessionId: string; idempotencyKey: string }) {
    if (!this.inquiries.some((inquiry) => inquiry.inquiryId === input.inquiryId)) return null;
    const replay = this.callbacks.find((callback) => callback.idempotencyKey === input.idempotencyKey);
    if (replay) return { callbackId: replay.callbackId, inquiryId: replay.inquiryId };
    const callback = {
      callbackId: `cb_${randomUUID()}`,
      inquiryId: input.inquiryId,
      idempotencyKey: input.idempotencyKey,
    };
    this.callbacks.push(callback);
    return { callbackId: callback.callbackId, inquiryId: callback.inquiryId };
  }

  async recordAppointment(input: AppointmentInput) {
    if (!this.inquiries.some((inquiry) => inquiry.inquiryId === input.inquiryId)) return null;
    const replay = this.appointments.find((item) => item.idempotencyKey === input.idempotencyKey);
    if (replay) return { appointmentId: replay.appointmentId, inquiryId: replay.inquiryId };
    const appointment = {
      appointmentId: `apt_${randomUUID()}`,
      inquiryId: input.inquiryId,
      idempotencyKey: input.idempotencyKey,
      appointmentType: input.appointmentType,
    };
    this.appointments.push(appointment);
    return { appointmentId: appointment.appointmentId, inquiryId: appointment.inquiryId };
  }

  snapshot() {
    return {
      customers: [...this.customers.entries()],
      inquiries: structuredClone(this.inquiries),
      events: structuredClone(this.events),
      callbacks: structuredClone(this.callbacks),
      appointments: structuredClone(this.appointments),
    };
  }
}
