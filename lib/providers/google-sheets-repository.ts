import { randomUUID } from "node:crypto";

import { google, type sheets_v4 } from "googleapis";

import type { ServerEnv } from "@/lib/config/env";
import type { FunnelRepository } from "@/lib/leads/contracts";
import type { ProductRecord } from "@/lib/products/contracts";
import type { EventInput, LeadSubmissionInput } from "@/lib/validation/schemas";
import type { IncomingInstagramContext, Specification } from "@/types/funnel";

type Row = Record<string, string>;

export function headerRecord(headers: string[], values: string[]): Row {
  return Object.fromEntries(headers.map((header, index) => [header.trim(), values[index] ?? ""]));
}

function boolean(value: string) {
  return ["true", "yes", "1", "active"].includes(value.trim().toLowerCase());
}

function safeJson<T>(value: string, fallback: T): T {
  try { return value ? (JSON.parse(value) as T) : fallback; } catch { return fallback; }
}

export function productFromRow(row: Row): ProductRecord | null {
  if (!row.product_id || !row.product_name || !row.reel_id || !row.campaign_id) return null;
  const specifications = safeJson<Specification[]>(row.specifications_json, []).filter(
    (item) => typeof item?.label === "string" && typeof item?.value === "string",
  );
  const imageUrl = /^https:\/\//.test(row.image_url ?? "") ? row.image_url : "";
  return {
    productId: row.product_id,
    productName: row.product_name,
    reelId: row.reel_id,
    campaignId: row.campaign_id,
    active: boolean(row.active_status),
    productImage: imageUrl ? {
      src: imageUrl,
      alt: row.image_alt || row.product_name,
      width: Number(row.image_width) || 1200,
      height: Number(row.image_height) || 1200,
    } : null,
    specifications,
    offerCopy: row.offer_copy || undefined,
    offerExpiresAt: row.offer_expires_at || undefined,
    calendly: {
      storeVisitUrl: /^https:\/\//.test(row.calendly_store_url ?? "") ? row.calendly_store_url : undefined,
      videoConsultationUrl: /^https:\/\//.test(row.calendly_video_url ?? "") ? row.calendly_video_url : undefined,
    },
    ctas: {
      whatsappEnabled: boolean(row.whatsapp_enabled),
      callbackEnabled: boolean(row.callback_enabled),
      order: safeJson(row.cta_order_json, undefined),
    },
  };
}

export class GoogleSheetsRepository implements FunnelRepository {
  private readonly client: sheets_v4.Sheets;
  private readonly spreadsheetId: string;
  private readonly tabs: ServerEnv["google"]["sheets"];

  constructor(config: ServerEnv["google"]) {
    if (!config.serviceAccountEmail || !config.privateKey || !config.spreadsheetId) {
      throw new Error("Google Sheets configuration is incomplete.");
    }
    const auth = new google.auth.JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.client = google.sheets({ version: "v4", auth });
    this.spreadsheetId = config.spreadsheetId;
    this.tabs = config.sheets;
  }

  private range(tab: string) { return `'${tab.replace(/'/g, "''")}'!A:ZZ`; }

  private async rows(tab: string) {
    const response = await this.client.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: this.range(tab) });
    const values = (response.data.values ?? []) as string[][];
    const [headers = [], ...rows] = values;
    return rows.map((row) => headerRecord(headers, row));
  }

  private async append(tab: string, values: Array<string | boolean>) {
    await this.client.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: this.range(tab),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] },
    });
  }

  async findByContext(context: IncomingInstagramContext) {
    const rows = await this.rows(this.tabs.products);
    return productFromRow(rows.find((row) => row.product_id === context.productId && row.reel_id === context.reelId && row.campaign_id === context.campaignId) ?? {}) ?? null;
  }

  async acceptLead(input: LeadSubmissionInput) {
    const inquiries = await this.rows(this.tabs.inquiries);
    const replay = inquiries.find((row) => row.idempotency_key === input.idempotencyKey);
    if (replay) return { inquiryId: replay.inquiry_id, customerId: replay.customer_id, isRepeatCustomer: boolean(replay.is_repeat_customer), wasReplay: true };
    const customers = await this.rows(this.tabs.customers);
    const existing = customers.find((row) => row.phone_normalized === input.mobileNumber);
    const customerId = existing?.customer_id || `cus_${randomUUID()}`;
    const inquiryId = `inq_${randomUUID()}`;
    const createdAt = new Date().toISOString();
    if (!existing) await this.append(this.tabs.customers, [customerId, createdAt, input.fullName, input.mobileNumber, input.pinCode, input.city]);
    await this.append(this.tabs.inquiries, [inquiryId, customerId, createdAt, input.fullName, input.mobileNumber, input.pinCode, input.city, Boolean(existing), input.productId, input.reelId, input.campaignId, "instagram", input.sessionId, input.landingPageVersion, input.idempotencyKey]);
    return { inquiryId, customerId, isRepeatCustomer: Boolean(existing), wasReplay: false };
  }

  async recordEvent(input: EventInput) {
    await this.append(this.tabs.events, [new Date().toISOString(), input.eventName, input.sessionId, input.inquiryId ?? "", input.customerId ?? "", input.productId, input.reelId, input.campaignId, "instagram", input.landingPageVersion, JSON.stringify(input.metadata ?? {})]);
  }

  async requestCallback(input: { inquiryId: string; sessionId: string; idempotencyKey: string }) {
    const inquiries = await this.rows(this.tabs.inquiries);
    if (!inquiries.some((row) => row.inquiry_id === input.inquiryId)) return null;
    const callbacks = await this.rows(this.tabs.callbacks);
    const replay = callbacks.find((row) => row.idempotency_key === input.idempotencyKey);
    if (replay) return { callbackId: replay.callback_id, inquiryId: replay.inquiry_id };
    const callbackId = `cb_${randomUUID()}`;
    await this.append(this.tabs.callbacks, [callbackId, input.inquiryId, input.sessionId, new Date().toISOString(), input.idempotencyKey, "requested"]);
    return { callbackId, inquiryId: input.inquiryId };
  }
}
