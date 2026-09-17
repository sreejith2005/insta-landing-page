import { randomUUID } from "node:crypto";

import { google, type sheets_v4 } from "googleapis";

import type { ServerEnv } from "@/lib/config/env";
import type { FunnelRepository, InquiryCountFilter } from "@/lib/leads/contracts";
import type { ProductRecord } from "@/lib/products/contracts";
import type { EventInput, LeadSubmissionInput } from "@/lib/validation/schemas";
import type { ProductMapping } from "@/types/funnel";

export type Row = Record<string, string>;

export const defaultHeaders = {
  products: [
    "product_id",
    "product_name",
    "reel_id",
    "campaign_id",
    "product_position",
    "active_status",
    "category",
    "collection",
    "campaign_name",
  ],
  customers: [
    "customer_id",
    "created_at",
    "name",
    "phone_normalized",
    "pin_code",
    "city",
    "first_source",
  ],
  inquiries: [
    "inquiry_id",
    "customer_id",
    "created_at",
    "name",
    "phone_normalized",
    "pin_code",
    "city",
    "is_repeat_customer",
    "product_id",
    "product_name",
    "reel_id",
    "campaign_id",
    "source",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "session_id",
    "landing_page_version",
    "idempotency_key",
  ],
  events: [
    "created_at",
    "event_name",
    "session_id",
    "inquiry_id",
    "customer_id",
    "product_id",
    "reel_id",
    "campaign_id",
    "source",
    "landing_page_version",
    "idempotency_key",
    "metadata_json",
  ],
} as const;

export function headerRecord(headers: string[], values: string[]): Row {
  return Object.fromEntries(
    headers.map((header, index) => [header.trim(), values[index] ?? ""]),
  );
}

function boolean(value: string | undefined) {
  return ["true", "yes", "1", "active"].includes((value ?? "").trim().toLowerCase());
}

export function productFromRow(row: Row): ProductRecord | null {
  const productId = row.product_id?.trim();
  const productName = row.product_name?.trim();
  const reelId = row.reel_id?.trim();
  const campaignId = row.campaign_id?.trim();
  if (!productId || !productName || !reelId || !campaignId) return null;

  const position = Number(row.product_position);
  return {
    productId,
    productName,
    reelId,
    campaignId,
    productPosition: Number.isInteger(position) && position > 0 ? position : undefined,
    active: boolean(row.active_status),
    category: row.category?.trim() || undefined,
    collection: row.collection?.trim() || undefined,
    campaignName: row.campaign_name?.trim() || undefined,
  };
}

export function countMatchingInquiries(
  rows: Row[],
  filter: InquiryCountFilter,
): number {
  const since = filter.since ? Date.parse(filter.since) : undefined;
  return rows.filter((row) => {
    if (row.product_id?.trim() !== filter.productId) return false;
    if (filter.reelId && row.reel_id?.trim() !== filter.reelId) return false;
    if (filter.campaignId && row.campaign_id?.trim() !== filter.campaignId) return false;
    if (since !== undefined) {
      const createdAt = Date.parse(row.created_at ?? "");
      if (!Number.isFinite(createdAt) || createdAt < since) return false;
    }
    return true;
  }).length;
}

export class GoogleSheetsRepository implements FunnelRepository {
  private readonly client: sheets_v4.Sheets;
  private readonly spreadsheetId: string;
  private readonly tabs: ServerEnv["google"]["sheets"];
  private readonly headerCache = new Map<string, string[]>();
  private readonly productCacheTtlMs = 90_000;
  private productCache?: { rows: Row[]; expiresAt: number };

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

  private range(tab: string) {
    return `'${tab.replace(/'/g, "''")}'!A:ZZ`;
  }

  private async values(tab: string) {
    const response = await this.client.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: this.range(tab),
    });
    return (response.data.values ?? []) as string[][];
  }

  private async rows(tab: string) {
    const values = await this.values(tab);
    const [headers = [], ...rows] = values;
    const normalizedHeaders = headers.map((header) => header.trim());
    if (normalizedHeaders.length) this.headerCache.set(tab, normalizedHeaders);
    return rows.map((row) => headerRecord(normalizedHeaders, row));
  }

  private async productRows() {
    const now = Date.now();
    if (this.productCache && this.productCache.expiresAt > now) return this.productCache.rows;
    const rows = await this.rows(this.tabs.products);
    this.productCache = { rows, expiresAt: now + this.productCacheTtlMs };
    return rows;
  }

  private async headersFor(tab: string, fallback: readonly string[]) {
    const cached = this.headerCache.get(tab);
    if (cached?.length) return cached;
    const [headers = []] = await this.values(tab);
    const resolved = headers.length ? headers.map((header) => header.trim()) : [...fallback];
    this.headerCache.set(tab, resolved);
    return resolved;
  }

  private async appendRecord(tab: string, fallback: readonly string[], record: Row) {
    const headers = await this.headersFor(tab, fallback);
    await this.client.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: this.range(tab),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [headers.map((header) => record[header] ?? "")] },
    });
  }

  async findByContext(context: ProductMapping) {
    const rows = await this.productRows();
    const row = rows.find(
      (candidate) =>
        candidate.product_id?.trim() === context.productId &&
        candidate.reel_id?.trim() === context.reelId &&
        candidate.campaign_id?.trim() === context.campaignId,
    );
    return row ? productFromRow(row) : null;
  }

  async acceptLead(input: LeadSubmissionInput, productName: string) {
    const inquiries = await this.rows(this.tabs.inquiries);
    const replay = inquiries.find((row) => row.idempotency_key === input.idempotencyKey);
    if (replay) {
      return {
        inquiryId: replay.inquiry_id,
        customerId: replay.customer_id,
        isRepeatCustomer: boolean(replay.is_repeat_customer),
        wasReplay: true,
      };
    }

    const customers = await this.rows(this.tabs.customers);
    const existing = customers.find((row) => row.phone_normalized === input.mobileNumber);
    const customerId = existing?.customer_id || `cus_${randomUUID()}`;
    const inquiryId = `inq_${randomUUID()}`;
    const createdAt = new Date().toISOString();

    if (!existing) {
      await this.appendRecord(this.tabs.customers, defaultHeaders.customers, {
        customer_id: customerId,
        created_at: createdAt,
        name: input.fullName,
        phone_normalized: input.mobileNumber,
        pin_code: input.pinCode,
        city: input.city,
        first_source: input.source,
      });
    }

    await this.appendRecord(this.tabs.inquiries, defaultHeaders.inquiries, {
      inquiry_id: inquiryId,
      customer_id: customerId,
      created_at: createdAt,
      name: input.fullName,
      phone_normalized: input.mobileNumber,
      pin_code: input.pinCode,
      city: input.city,
      is_repeat_customer: String(Boolean(existing)),
      product_id: input.productId,
      product_name: productName,
      reel_id: input.reelId,
      campaign_id: input.campaignId,
      source: input.source,
      utm_source: input.utmSource ?? "",
      utm_medium: input.utmMedium ?? "",
      utm_campaign: input.utmCampaign ?? "",
      utm_content: input.utmContent ?? "",
      utm_term: input.utmTerm ?? "",
      session_id: input.sessionId,
      landing_page_version: input.landingPageVersion,
      idempotency_key: input.idempotencyKey,
    });

    return { inquiryId, customerId, isRepeatCustomer: Boolean(existing), wasReplay: false };
  }

  async recordEvent(input: EventInput) {
    await this.appendRecord(this.tabs.events, defaultHeaders.events, {
      created_at: new Date().toISOString(),
      event_name: input.eventName,
      session_id: input.sessionId,
      inquiry_id: input.inquiryId ?? "",
      customer_id: input.customerId ?? "",
      product_id: input.productId,
      reel_id: input.reelId,
      campaign_id: input.campaignId,
      source: input.source,
      landing_page_version: input.landingPageVersion,
      idempotency_key: "",
      metadata_json: JSON.stringify(input.metadata ?? {}),
    });
  }

  async countInquiriesForContext(filter: InquiryCountFilter) {
    return countMatchingInquiries(await this.rows(this.tabs.inquiries), filter);
  }
}
