import { randomUUID } from "node:crypto";

import { google, type sheets_v4 } from "googleapis";

import type { ServerEnv } from "@/lib/config/env";
import type {
  AcceptLeadOptions,
  BookingRecord,
  FunnelRepository,
  InquiryContact,
  InquiryCountFilter,
  InquiryMatch,
  PassRecord,
  StoreRecord,
  StoreVisitRecord,
} from "@/lib/leads/contracts";
import { createReferenceNumberSource, type ReferenceNumberSource } from "@/lib/leads/reference-number";
import type { ProductRecord } from "@/lib/products/contracts";
import type { EventInput, LeadSubmissionInput } from "@/lib/validation/schemas";
import type { ProductMapping, ReelMapping, ResolvedAttributionContext } from "@/types/funnel";

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
  reelMap: ["reel_id", "campaign_id", "product_position", "product_id", "active_status"],
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
    /** Same value as the FMS tab's REFERENCE NUMBER; lets a booking find it from the inquiry ID. */
    "reference_number",
    /** The enquiry's store pass code, e.g. "MK30-7KQ4-X9MP". */
    "pass_code",
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
  /**
   * Calendly bookings from the webhook. `calendly_invitee_uri` makes retries
   * idempotent; `reference_number` cross-references the Instagram FMS tab.
   */
  bookings: [
    "created_at",
    "booking_type",
    "scheduled_start",
    "scheduled_end",
    "invitee_name",
    "invitee_email",
    "product_id",
    "reel_id",
    "campaign_id",
    "calendly_invitee_uri",
    "reference_number",
  ],
  /** Operations tracker. Headers are the team's exact column titles. */
  instagramFms: [
    "Timestamp",
    "REFERENCE NUMBER",
    "DM RECEIVED DATE",
    "ASSIGNED BY",
    "CUSTOMER NAME",
    "INSTAGRAM ID",
    "CUSTOMER CONTACT NUMBER",
    "ADDRESS",
    "CITY",
    "STATE",
    "PIN CODE",
    "SOURCE OF THE LEAD",
    "PRODUCT NUMBER",
    "PRICING",
    "IMAGE",
    "BENEFIT CODE",
  ],
  /**
   * One row per staff action on a store pass. The enquiry's attribution is
   * copied onto every row so the tab can be filtered by Reel or campaign alone.
   */
  storeVisits: [
    "created_at",
    "action",
    "store",
    "staff_name",
    "pass_code",
    "customer_name",
    "phone",
    "inquiry_id",
    "customer_id",
    "product_id",
    "reel_id",
    "campaign_id",
    "invoice_number",
    "bill_amount",
  ],
  stores: ["store", "pin", "active"],
} as const;

/**
 * Columns added after the tabs were first set up. If one is missing from the
 * live sheet it is added to the header row before writing, rather than its
 * value being silently dropped.
 */
const addedColumns = {
  inquiries: ["pass_code"],
  instagramFms: ["BENEFIT CODE"],
  storeVisits: defaultHeaders.storeVisits,
} as const;

/** Spreadsheet column letters for a zero-based index: 0 → A, 26 → AA. */
export function columnLetter(index: number) {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

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
    imageUrl: row.image_url?.trim() || undefined,
    calendlyStoreUrl: row.calendly_store_url?.trim() || undefined,
    calendlyVideoUrl: row.calendly_video_url?.trim() || undefined,
  };
}

const trimmed = (value: string | undefined) => (value ?? "").trim();

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * ISO 8601 timestamp in India Standard Time, e.g. "2026-09-17T19:43:04.488+05:30".
 * Readable at a glance by the team in the sheet, and still an exact instant for
 * `Date.parse`, so recent-window counts are unaffected.
 */
export function sheetTimestamp(date: Date = new Date()) {
  return `${new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, -1)}+05:30`;
}

/** IST "DD/MM/YYYY", the Instagram FMS tab's date format. */
export function fmsDateOnly(date: Date) {
  const [year, month, day] = new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

/**
 * IST "DD/MM/YYYY HH:MM:SS" (24-hour, no milliseconds or zone), e.g.
 * "18/09/2026 18:25:37". Instagram FMS tab only: every other tab keeps
 * `sheetTimestamp`, which replay and recent-window counts parse.
 */
export function fmsDateTime(date: Date) {
  return `${fmsDateOnly(date)} ${new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(11, 19)}`;
}

/**
 * Plain 10-digit number for the FMS tab: spaces and a leading +91/91 country
 * code removed. A bare "91" is only stripped from a 12-digit number, so a
 * 10-digit number that happens to start with 91 is left intact.
 */
export function fmsPhone(phone: string) {
  const compact = phone.replace(/\s+/g, "");
  if (compact.startsWith("+91")) return compact.slice(3);
  if (compact.length === 12 && compact.startsWith("91")) return compact.slice(2);
  return compact;
}

/** The team's wording for each funnel source on the FMS tab. */
export const fmsSourceLabels: Record<LeadSubmissionInput["source"], string> = {
  instagram: "Direct Message",
  manychat: "Direct Message",
  whatsapp: "WhatsApp",
  direct: "Direct",
};

/**
 * Resolves a context through the Reel_Product_Map tab: the exact
 * reel/campaign/product row decides whether the mapping exists and is active,
 * and the Products tab supplies the attribution fields for that product_id.
 * A mapping whose product is missing from Products does not resolve.
 */
export function productFromMap(
  productRows: Row[],
  mapRows: Row[],
  context: ProductMapping,
): ProductRecord | null {
  const mapping = mapRows.find(
    (row) =>
      trimmed(row.product_id) === context.productId &&
      trimmed(row.reel_id) === context.reelId &&
      trimmed(row.campaign_id) === context.campaignId,
  );
  if (!mapping) return null;

  const candidates = productRows.filter((row) => trimmed(row.product_id) === context.productId);
  const product =
    candidates.find(
      (row) => trimmed(row.reel_id) === context.reelId && trimmed(row.campaign_id) === context.campaignId,
    ) ?? candidates[0];
  if (!product) return null;

  const record = productFromRow({
    ...product,
    reel_id: context.reelId,
    campaign_id: context.campaignId,
    product_position: trimmed(mapping.product_position) || product.product_position || "",
  });
  if (!record) return null;

  // Both switches must be on: the Reel mapping and, when filled in, the product itself.
  const productActive = trimmed(product.active_status) ? boolean(product.active_status) : true;
  return { ...record, active: boolean(mapping.active_status) && productActive };
}

/** Stable sort by product_position; unpositioned products keep sheet order, last. */
export function byProductPosition(records: ProductRecord[]) {
  return [...records].sort(
    (a, b) => (a.productPosition ?? Number.POSITIVE_INFINITY) - (b.productPosition ?? Number.POSITIVE_INFINITY),
  );
}

/**
 * Every active product a Reel/campaign maps to, for a link that names no
 * product. Each candidate goes through `productFromMap`, so it is exactly the
 * record a link naming that product would resolve to, and only records that
 * would resolve as active are returned.
 */
export function productsForReel(productRows: Row[], mapRows: Row[], context: ReelMapping): ProductRecord[] {
  const productIds = new Set(
    mapRows
      .filter(
        (row) =>
          trimmed(row.reel_id) === context.reelId &&
          trimmed(row.campaign_id) === context.campaignId &&
          boolean(row.active_status),
      )
      .map((row) => trimmed(row.product_id))
      .filter(Boolean),
  );
  const records = [...productIds].map((productId) => productFromMap(productRows, mapRows, { ...context, productId }));
  return byProductPosition(records.filter((record): record is ProductRecord => Boolean(record?.active)));
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

function inquiryMatch(row: Row): InquiryMatch {
  return {
    inquiryId: trimmed(row.inquiry_id),
    referenceNumber: trimmed(row.reference_number),
    productId: trimmed(row.product_id),
    reelId: trimmed(row.reel_id),
    campaignId: trimmed(row.campaign_id),
  };
}

/** The inquiry row with this ID. IDs are unique, so the first match is the only one. */
export function inquiryById(rows: Row[], inquiryId: string): InquiryMatch | null {
  const row = rows.find((candidate) => trimmed(candidate.inquiry_id) === inquiryId);
  return row ? inquiryMatch(row) : null;
}

/**
 * The most recent inquiry row for a contact. Inquiries stores phone numbers
 * but not email, so today only phones match; an `email` column, if the tab
 * ever gains one, is matched case-insensitively too.
 */
export function latestInquiryForContact(rows: Row[], contact: InquiryContact): InquiryMatch | null {
  const email = contact.email?.trim().toLowerCase();
  const phones = new Set(contact.phones);
  let latest: { row: Row; at: number } | undefined;
  for (const row of rows) {
    const matches =
      (email && trimmed(row.email).toLowerCase() === email) || phones.has(trimmed(row.phone_normalized));
    if (!matches || !trimmed(row.product_id)) continue;
    const at = Date.parse(row.created_at ?? "");
    const time = Number.isFinite(at) ? at : -Infinity;
    // `>=` so that, on equal or unreadable dates, the later-appended row wins.
    if (!latest || time >= latest.at) latest = { row, at: time };
  }
  return latest ? inquiryMatch(latest.row) : null;
}

export function passFromRow(row: Row): PassRecord | null {
  const passCode = trimmed(row.pass_code);
  if (!passCode) return null;
  return {
    passCode,
    inquiryId: trimmed(row.inquiry_id),
    customerId: trimmed(row.customer_id),
    issuedAt: trimmed(row.created_at),
    customerName: trimmed(row.name),
    phone: trimmed(row.phone_normalized),
    city: trimmed(row.city),
    productId: trimmed(row.product_id),
    productName: trimmed(row.product_name),
    reelId: trimmed(row.reel_id),
    campaignId: trimmed(row.campaign_id),
  };
}

/** Stores tab rows. The name is the ID, so rows without one are skipped. */
export function storesFromRows(rows: Row[]): StoreRecord[] {
  return rows
    .map((row) => ({ name: trimmed(row.store), pin: trimmed(row.pin), active: boolean(row.active) }))
    .filter((store) => store.name);
}

export function storeVisitFromRow(row: Row): StoreVisitRecord {
  return {
    createdAt: trimmed(row.created_at),
    action: trimmed(row.action) === "purchased" ? "purchased" : "visited",
    store: trimmed(row.store),
    staffName: trimmed(row.staff_name),
    passCode: trimmed(row.pass_code),
    customerName: trimmed(row.customer_name),
    phone: trimmed(row.phone),
    inquiryId: trimmed(row.inquiry_id),
    customerId: trimmed(row.customer_id),
    productId: trimmed(row.product_id),
    reelId: trimmed(row.reel_id),
    campaignId: trimmed(row.campaign_id),
    invoiceNumber: trimmed(row.invoice_number),
    billAmount: trimmed(row.bill_amount),
  };
}

export class GoogleSheetsRepository implements FunnelRepository {
  private readonly client: sheets_v4.Sheets;
  private readonly spreadsheetId: string;
  private readonly tabs: ServerEnv["google"]["sheets"];
  private readonly headerCache = new Map<string, string[]>();
  private readonly productCacheTtlMs = 90_000;
  private productCache?: { rows: Row[]; mapRows: Row[] | null; expiresAt: number };
  private mapTabUnavailable = false;
  /** Tabs whose header row has been checked for `addedColumns` in this process. */
  private readonly checkedColumns = new Set<string>();
  private readonly storeCacheTtlMs = 60_000;
  private storeCache?: { stores: StoreRecord[]; expiresAt: number };
  private readonly referenceNumber: ReferenceNumberSource;

  constructor(
    config: ServerEnv["google"],
    options: { referenceNumber?: ReferenceNumberSource } = {},
  ) {
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
    this.referenceNumber = options.referenceNumber ?? createReferenceNumberSource();
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

  /** Reel map rows, or null when no map tab is configured or it does not exist. */
  private async mapRows(): Promise<Row[] | null> {
    const tab = this.tabs.reelMap;
    if (!tab || this.mapTabUnavailable) return null;
    try {
      return await this.rows(tab);
    } catch (error) {
      // A missing tab is a 400 "Unable to parse range"; anything else is a real failure.
      if ((error as { code?: number }).code !== 400) throw error;
      this.mapTabUnavailable = true;
      console.error(`Reel map tab "${tab}" not found; using the flat product tab only.`);
      return null;
    }
  }

  private async productData() {
    const now = Date.now();
    if (this.productCache && this.productCache.expiresAt > now) return this.productCache;
    const [rows, mapRows] = await Promise.all([this.rows(this.tabs.products), this.mapRows()]);
    this.productCache = { rows, mapRows, expiresAt: now + this.productCacheTtlMs };
    return this.productCache;
  }

  private async headersFor(tab: string, fallback: readonly string[]) {
    const cached = this.headerCache.get(tab);
    if (cached?.length) return cached;
    const [headers = []] = await this.values(tab);
    const resolved = headers.length ? headers.map((header) => header.trim()) : [...fallback];
    this.headerCache.set(tab, resolved);
    return resolved;
  }

  /**
   * Adds any of `required` missing from the tab's live header row (an empty tab
   * gets the whole `fallback` row). Checked once per tab per process.
   */
  private async ensureColumns(tab: string, fallback: readonly string[], required: readonly string[]) {
    if (this.checkedColumns.has(tab)) return this.headersFor(tab, fallback);
    const response = await this.client.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `'${tab.replace(/'/g, "''")}'!1:1`,
    });
    const [sheetHeaders = []] = (response.data.values ?? []) as string[][];
    const current = sheetHeaders.map((header) => header.trim());
    const missing = current.length ? required.filter((header) => !current.includes(header)) : [...fallback];
    if (missing.length) {
      await this.client.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `'${tab.replace(/'/g, "''")}'!${columnLetter(current.length)}1`,
        valueInputOption: "RAW",
        requestBody: { values: [missing] },
      });
      console.warn(JSON.stringify({ event: "sheet.columns_added", tab, columns: missing }));
    }
    const headers = [...current, ...missing];
    this.headerCache.set(tab, headers);
    this.checkedColumns.add(tab);
    return headers;
  }

  private async appendRecord(tab: string, fallback: readonly string[], record: Row, required?: readonly string[]) {
    const headers = required ? await this.ensureColumns(tab, fallback, required) : await this.headersFor(tab, fallback);
    await this.client.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: this.range(tab),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [headers.map((header) => record[header] ?? "")] },
    });
  }

  async findByContext(context: ProductMapping) {
    const { rows, mapRows } = await this.productData();
    if (mapRows) return productFromMap(rows, mapRows, context);
    const row = rows.find(
      (candidate) =>
        candidate.product_id?.trim() === context.productId &&
        candidate.reel_id?.trim() === context.reelId &&
        candidate.campaign_id?.trim() === context.campaignId,
    );
    return row ? productFromRow(row) : null;
  }

  async findActiveByReel(context: ReelMapping) {
    const { rows, mapRows } = await this.productData();
    if (mapRows) return productsForReel(rows, mapRows, context);
    // Flat product tab: the first row per product_id decides, as `findByContext` does.
    const records = new Map<string, ProductRecord | null>();
    for (const row of rows) {
      if (row.reel_id?.trim() !== context.reelId || row.campaign_id?.trim() !== context.campaignId) continue;
      const productId = row.product_id?.trim();
      if (productId && !records.has(productId)) records.set(productId, productFromRow(row));
    }
    return byProductPosition(
      [...records.values()].filter((record): record is ProductRecord => Boolean(record?.active)),
    );
  }

  async acceptLead(input: LeadSubmissionInput, product: ResolvedAttributionContext, options: AcceptLeadOptions = {}) {
    const inquiries = await this.rows(this.tabs.inquiries);
    const replay = inquiries.find((row) => row.idempotency_key === input.idempotencyKey);
    if (replay) {
      return {
        inquiryId: replay.inquiry_id,
        customerId: replay.customer_id,
        isRepeatCustomer: boolean(replay.is_repeat_customer),
        wasReplay: true,
        passCode: trimmed(replay.pass_code) || undefined,
        createdAt: trimmed(replay.created_at),
      };
    }

    const customers = await this.rows(this.tabs.customers);
    const existing = customers.find((row) => row.phone_normalized === input.mobileNumber);
    const customerId = existing?.customer_id || `cus_${randomUUID()}`;
    const inquiryId = `inq_${randomUUID()}`;
    const now = new Date();
    const createdAt = sheetTimestamp(now);
    // Issued before either write so Inquiries and the FMS tab hold the same one.
    const referenceNumber = await this.referenceNumber(now);

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
      product_id: input.productId ?? "",
      product_name: product.productName,
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
      reference_number: referenceNumber,
      // In the same row as the lead, so a lead is never saved without its pass.
      pass_code: options.passCode ?? "",
    }, options.passCode ? addedColumns.inquiries : undefined);

    await this.appendInstagramFms(input, product, inquiryId, referenceNumber, now, options.passCode);

    return {
      inquiryId,
      customerId,
      isRepeatCustomer: Boolean(existing),
      wasReplay: false,
      passCode: options.passCode,
      createdAt,
    };
  }

  /**
   * Operations copy of a new lead for the Instagram FMS tab. Best-effort:
   * Inquiries is the record of truth for idempotency and replay, so a failure
   * here is logged and never fails the customer's submission. ASSIGNED BY,
   * ADDRESS and PRICING are left for the team and the Apps Script round-robin.
   */
  private async appendInstagramFms(
    input: LeadSubmissionInput,
    product: ResolvedAttributionContext,
    inquiryId: string,
    referenceNumber: string,
    createdAt: Date,
    passCode?: string,
  ) {
    const tab = this.tabs.instagramFms;
    if (!tab) return;
    // Without a usable ManyChat DM time, the lead's own date stands in.
    const dmReceivedAt = input.dmReceivedAt ? new Date(input.dmReceivedAt) : undefined;
    const dmDate = dmReceivedAt && Number.isFinite(dmReceivedAt.getTime()) ? dmReceivedAt : createdAt;
    try {
      await this.appendRecord(tab, defaultHeaders.instagramFms, {
        Timestamp: fmsDateTime(createdAt),
        "REFERENCE NUMBER": referenceNumber,
        "DM RECEIVED DATE": fmsDateOnly(dmDate),
        "ASSIGNED BY": "",
        "CUSTOMER NAME": input.fullName,
        "INSTAGRAM ID": input.instagramUsername ?? "",
        "CUSTOMER CONTACT NUMBER": fmsPhone(input.mobileNumber),
        ADDRESS: "",
        CITY: input.city,
        STATE: input.state ?? "",
        "PIN CODE": input.pinCode,
        "SOURCE OF THE LEAD": fmsSourceLabels[input.source],
        "PRODUCT NUMBER": input.productId,
        PRICING: "",
        IMAGE: product.imageUrl ?? "",
        "BENEFIT CODE": passCode ?? "",
      }, passCode ? addedColumns.instagramFms : undefined);
    } catch (error) {
      // Message only: a Sheets error can echo the request body, which is PII.
      console.error("Instagram FMS write failed", { inquiryId, error: (error as Error).message });
    }
  }

  async recordEvent(input: EventInput) {
    await this.appendRecord(this.tabs.events, defaultHeaders.events, {
      created_at: sheetTimestamp(),
      event_name: input.eventName,
      session_id: input.sessionId,
      inquiry_id: input.inquiryId ?? "",
      customer_id: input.customerId ?? "",
      product_id: input.productId ?? "",
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

  async findInquiryById(inquiryId: string) {
    return inquiryById(await this.rows(this.tabs.inquiries), inquiryId);
  }

  async findLatestInquiryByContact(contact: InquiryContact) {
    if (!contact.email && !contact.phones.length) return null;
    return latestInquiryForContact(await this.rows(this.tabs.inquiries), contact);
  }

  async recordBooking(booking: BookingRecord) {
    const existing = await this.rows(this.tabs.bookings);
    if (existing.some((row) => trimmed(row.calendly_invitee_uri) === booking.inviteeUri)) {
      return { wasReplay: true };
    }
    await this.appendRecord(this.tabs.bookings, defaultHeaders.bookings, {
      created_at: sheetTimestamp(),
      booking_type: booking.bookingType,
      scheduled_start: sheetTimestamp(new Date(booking.scheduledStart)),
      scheduled_end: sheetTimestamp(new Date(booking.scheduledEnd)),
      invitee_name: booking.inviteeName,
      invitee_email: booking.inviteeEmail,
      product_id: booking.attribution?.productId ?? "",
      reel_id: booking.attribution?.reelId ?? "",
      campaign_id: booking.attribution?.campaignId ?? "",
      calendly_invitee_uri: booking.inviteeUri,
      reference_number: booking.attribution?.referenceNumber ?? "",
    });
    return { wasReplay: false };
  }

  async findPassByCode(passCode: string) {
    const row = (await this.rows(this.tabs.inquiries)).find((candidate) => trimmed(candidate.pass_code) === passCode);
    return row ? passFromRow(row) : null;
  }

  /** Cached briefly: every staff page checks its login against this tab. */
  async listStores() {
    const now = Date.now();
    if (this.storeCache && this.storeCache.expiresAt > now) return this.storeCache.stores;
    const stores = storesFromRows(await this.rows(this.tabs.stores));
    this.storeCache = { stores, expiresAt: now + this.storeCacheTtlMs };
    return stores;
  }

  async listStoreVisits(customerId: string) {
    return (await this.rows(this.tabs.storeVisits))
      .filter((row) => trimmed(row.customer_id) === customerId)
      .map(storeVisitFromRow);
  }

  async recordStoreVisit(visit: Omit<StoreVisitRecord, "createdAt">) {
    const record: StoreVisitRecord = { ...visit, createdAt: sheetTimestamp() };
    await this.appendRecord(
      this.tabs.storeVisits,
      defaultHeaders.storeVisits,
      {
        created_at: record.createdAt,
        action: record.action,
        store: record.store,
        staff_name: record.staffName,
        pass_code: record.passCode,
        customer_name: record.customerName,
        phone: record.phone,
        inquiry_id: record.inquiryId,
        customer_id: record.customerId,
        product_id: record.productId,
        reel_id: record.reelId,
        campaign_id: record.campaignId,
        invoice_number: record.invoiceNumber,
        bill_amount: record.billAmount,
      },
      addedColumns.storeVisits,
    );
    return record;
  }
}
