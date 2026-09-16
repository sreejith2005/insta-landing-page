import { randomUUID } from "node:crypto";

import { google, type sheets_v4 } from "googleapis";

import type { ServerEnv } from "@/lib/config/env";
import type { AppointmentRecord, FunnelRepository } from "@/lib/leads/contracts";
import type { ProductRecord } from "@/lib/products/contracts";
import type {
  AppointmentInput,
  EventInput,
  LeadSubmissionInput,
} from "@/lib/validation/schemas";
import type { ProductMapping, Specification } from "@/types/funnel";

type Row = Record<string, string>;

/**
 * Canonical column order, used only when a tab has no header row yet.
 *
 * Existing sheets drive both reads and writes from their own header row,
 * so columns may be reordered or extended without touching this file.
 */
export const defaultHeaders = {
  products: [
    "product_id",
    "product_name",
    "category",
    "collection",
    "reel_id",
    "campaign_id",
    "product_position",
    "active_status",
    "image_url",
    "image_alt",
    "image_width",
    "image_height",
    "specifications_json",
    "offer_copy",
    "offer_expires_at",
    "calendly_store_url",
    "calendly_video_url",
    "whatsapp_number",
    "whatsapp_template",
    "whatsapp_enabled",
    "callback_enabled",
    "cta_order_json",
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

  callbacks: [
    "callback_id",
    "inquiry_id",
    "session_id",
    "created_at",
    "idempotency_key",
    "status",
  ],
} as const;

/**
 * Converts one Google Sheets row into an object using the actual header row.
 */
export function headerRecord(headers: string[], values: string[]): Row {
  return Object.fromEntries(
    headers.map((header, index) => [
      header.trim(),
      values[index] ?? "",
    ]),
  );
}

/**
 * Google Sheets may return short rows when trailing cells are empty.
 * Every parser therefore tolerates undefined values.
 */
function boolean(value: string | undefined) {
  return ["true", "yes", "1", "active"].includes(
    (value ?? "").trim().toLowerCase(),
  );
}

/**
 * Safely parses JSON.
 *
 * Invalid JSON never crashes the product funnel.
 */
function safeJson<T>(value: string | undefined, fallback: T): T {
  if (!value?.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Verifies that an unknown JSON value is a valid Specification.
 */
function isSpecification(value: unknown): value is Specification {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.label === "string" &&
    typeof item.value === "string"
  );
}

/**
 * Parses specifications_json safely.
 *
 * The Google Sheet MUST ideally contain:
 *
 * [
 *   {"label":"Purity","value":"18K"},
 *   {"label":"Material","value":"Gold"}
 * ]
 *
 * However, if somebody accidentally enters:
 *
 * {"label":"Purity","value":"18K"}
 *
 * or invalid JSON, the page will no longer crash.
 * It will simply return an empty specifications array.
 */
function parseSpecifications(value: string | undefined): Specification[] {
  const parsed = safeJson<unknown>(value, []);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isSpecification);
}

/**
 * Only HTTPS external URLs are allowed.
 */
function httpsOrUndefined(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed && /^https:\/\//.test(trimmed)
    ? trimmed
    : undefined;
}

/**
 * Converts one Product_Master row into the application's ProductRecord.
 *
 * Product price is deliberately not read/projected into the public record.
 */
export function productFromRow(row: Row): ProductRecord | null {
  const productId = row.product_id?.trim();
  const productName = row.product_name?.trim();
  const reelId = row.reel_id?.trim();
  const campaignId = row.campaign_id?.trim();

  if (!productId || !productName || !reelId || !campaignId) {
    return null;
  }

  const specifications = parseSpecifications(row.specifications_json);

  const imageUrl = httpsOrUndefined(row.image_url);

  const position = Number(row.product_position);

  const rawWhatsappNumber = (row.whatsapp_number ?? "").trim();

  const whatsappNumber = /^[1-9][0-9]{7,14}$/.test(rawWhatsappNumber)
    ? rawWhatsappNumber
    : undefined;

  return {
    productId,
    productName,

    category: row.category?.trim() || undefined,
    collection: row.collection?.trim() || undefined,

    reelId,
    campaignId,

    productPosition:
      Number.isInteger(position) && position > 0
        ? position
        : undefined,

    active: boolean(row.active_status),

    productImage: imageUrl
      ? {
        src: imageUrl,
        alt: row.image_alt?.trim() || productName,
        width: Number(row.image_width) || 1200,
        height: Number(row.image_height) || 1200,
      }
      : null,

    specifications,

    offerCopy: row.offer_copy?.trim() || undefined,

    offerExpiresAt:
      row.offer_expires_at?.trim() || undefined,

    calendly: {
      storeVisitUrl: httpsOrUndefined(
        row.calendly_store_url,
      ),

      videoConsultationUrl: httpsOrUndefined(
        row.calendly_video_url,
      ),
    },

    whatsapp: {
      number: whatsappNumber,
      messageTemplate:
        row.whatsapp_template?.trim() || undefined,
    },

    ctas: {
      whatsappEnabled: boolean(
        row.whatsapp_enabled,
      ),

      callbackEnabled: boolean(
        row.callback_enabled,
      ),

      order: safeJson(
        row.cta_order_json,
        undefined,
      ),
    },
  };
}

export class GoogleSheetsRepository implements FunnelRepository {
  private readonly client: sheets_v4.Sheets;

  private readonly spreadsheetId: string;

  private readonly tabs: ServerEnv["google"]["sheets"];

  private readonly headerCache = new Map<
    string,
    string[]
  >();

  constructor(config: ServerEnv["google"]) {
    if (
      !config.serviceAccountEmail ||
      !config.privateKey ||
      !config.spreadsheetId
    ) {
      throw new Error(
        "Google Sheets configuration is incomplete.",
      );
    }

    const auth = new google.auth.JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });

    this.client = google.sheets({
      version: "v4",
      auth,
    });

    this.spreadsheetId = config.spreadsheetId;

    this.tabs = config.sheets;
  }

  /**
   * Safely creates an A:ZZ range for a sheet tab.
   */
  private range(tab: string) {
    return `'${tab.replace(/'/g, "''")}'!A:ZZ`;
  }

  /**
   * Reads the raw values from one Google Sheet tab.
   */
  private async values(tab: string) {
    const response =
      await this.client.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.range(tab),
      });

    return (
      response.data.values ?? []
    ) as string[][];
  }

  /**
   * Reads a tab and converts every data row into a header-indexed object.
   */
  private async rows(tab: string) {
    const values = await this.values(tab);

    const [headers = [], ...rows] = values;

    const normalizedHeaders = headers.map(
      (header) => header.trim(),
    );

    if (normalizedHeaders.length) {
      this.headerCache.set(
        tab,
        normalizedHeaders,
      );
    }

    return rows.map((row) =>
      headerRecord(normalizedHeaders, row),
    );
  }

  /**
   * Returns the real header row from the sheet.
   *
   * If a sheet is empty, the canonical fallback
   * headers are used.
   */
  private async headersFor(
    tab: string,
    fallback: readonly string[],
  ) {
    const cached =
      this.headerCache.get(tab);

    if (cached?.length) {
      return cached;
    }

    const [headers = []] =
      await this.values(tab);

    const resolved = headers.length
      ? headers.map((header) => header.trim())
      : [...fallback];

    this.headerCache.set(
      tab,
      resolved,
    );

    return resolved;
  }

  /**
   * Writes are header-indexed.
   *
   * Each value is placed under its matching
   * column name, so reordering Google Sheet
   * columns cannot corrupt stored data.
   */
  private async appendRecord(
    tab: string,
    fallback: readonly string[],
    record: Row,
  ) {
    const headers =
      await this.headersFor(
        tab,
        fallback,
      );

    const values = headers.map(
      (header) => record[header] ?? "",
    );

    await this.client.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,

      range: this.range(tab),

      valueInputOption: "RAW",

      insertDataOption: "INSERT_ROWS",

      requestBody: {
        values: [values],
      },
    });
  }

  /**
   * Resolves a product only when the complete:
   *
   * product + reel + campaign
   *
   * combination matches.
   */
  async findByContext(
    context: ProductMapping,
  ) {
    const rows =
      await this.rows(
        this.tabs.products,
      );

    const match = rows.find(
      (row) =>
        row.product_id?.trim() ===
        context.productId &&
        row.reel_id?.trim() ===
        context.reelId &&
        row.campaign_id?.trim() ===
        context.campaignId,
    );

    return match
      ? productFromRow(match)
      : null;
  }

  /**
   * Accepts a lead.
   *
   * phone_normalized identifies a CUSTOMER.
   *
   * It does not identify an inquiry.
   *
   * Existing customers always receive a new
   * inquiry for a new attributable interaction.
   */
  async acceptLead(
    input: LeadSubmissionInput,
  ) {
    const inquiries =
      await this.rows(
        this.tabs.inquiries,
      );

    const replay = inquiries.find(
      (row) =>
        row.idempotency_key ===
        input.idempotencyKey,
    );

    if (replay) {
      return {
        inquiryId:
          replay.inquiry_id,

        customerId:
          replay.customer_id,

        isRepeatCustomer:
          boolean(
            replay.is_repeat_customer,
          ),

        wasReplay: true,
      };
    }

    const customers =
      await this.rows(
        this.tabs.customers,
      );

    const existing =
      customers.find(
        (row) =>
          row.phone_normalized ===
          input.mobileNumber,
      );

    const customerId =
      existing?.customer_id ||
      `cus_${randomUUID()}`;

    const inquiryId =
      `inq_${randomUUID()}`;

    const createdAt =
      new Date().toISOString();

    if (!existing) {
      await this.appendRecord(
        this.tabs.customers,
        defaultHeaders.customers,
        {
          customer_id:
            customerId,

          created_at:
            createdAt,

          name:
            input.fullName,

          phone_normalized:
            input.mobileNumber,

          pin_code:
            input.pinCode,

          city:
            input.city,

          first_source:
            input.source,
        },
      );
    }

    /**
     * Repeat customers always get a new
     * inquiry row.
     *
     * This preserves:
     *
     * product
     * Reel
     * campaign
     * source
     * UTM attribution
     */
    await this.appendRecord(
      this.tabs.inquiries,
      defaultHeaders.inquiries,
      {
        inquiry_id:
          inquiryId,

        customer_id:
          customerId,

        created_at:
          createdAt,

        name:
          input.fullName,

        phone_normalized:
          input.mobileNumber,

        pin_code:
          input.pinCode,

        city:
          input.city,

        is_repeat_customer:
          String(Boolean(existing)),

        product_id:
          input.productId,

        reel_id:
          input.reelId,

        campaign_id:
          input.campaignId,

        source:
          input.source,

        utm_source:
          input.utmSource ?? "",

        utm_medium:
          input.utmMedium ?? "",

        utm_campaign:
          input.utmCampaign ?? "",

        utm_content:
          input.utmContent ?? "",

        utm_term:
          input.utmTerm ?? "",

        session_id:
          input.sessionId,

        landing_page_version:
          input.landingPageVersion,

        idempotency_key:
          input.idempotencyKey,
      },
    );

    return {
      inquiryId,
      customerId,
      isRepeatCustomer:
        Boolean(existing),
      wasReplay: false,
    };
  }

  /**
   * Stores a funnel analytics event.
   */
  async recordEvent(
    input: EventInput,
    idempotencyKey = "",
  ) {
    await this.appendRecord(
      this.tabs.events,
      defaultHeaders.events,
      {
        created_at:
          new Date().toISOString(),

        event_name:
          input.eventName,

        session_id:
          input.sessionId,

        inquiry_id:
          input.inquiryId ?? "",

        customer_id:
          input.customerId ?? "",

        product_id:
          input.productId,

        reel_id:
          input.reelId,

        campaign_id:
          input.campaignId,

        source:
          input.source,

        landing_page_version:
          input.landingPageVersion,

        idempotency_key:
          idempotencyKey,

        metadata_json:
          JSON.stringify(
            input.metadata ?? {},
          ),
      },
    );
  }

  /**
   * Creates an operational callback request.
   */
  async requestCallback(
    input: {
      inquiryId: string;
      sessionId: string;
      idempotencyKey: string;
    },
  ) {
    const inquiries =
      await this.rows(
        this.tabs.inquiries,
      );

    const inquiryExists =
      inquiries.some(
        (row) =>
          row.inquiry_id ===
          input.inquiryId,
      );

    if (!inquiryExists) {
      return null;
    }

    const callbacks =
      await this.rows(
        this.tabs.callbacks,
      );

    const replay =
      callbacks.find(
        (row) =>
          row.idempotency_key ===
          input.idempotencyKey,
      );

    if (replay) {
      return {
        callbackId:
          replay.callback_id,

        inquiryId:
          replay.inquiry_id,
      };
    }

    const callbackId =
      `cb_${randomUUID()}`;

    await this.appendRecord(
      this.tabs.callbacks,
      defaultHeaders.callbacks,
      {
        callback_id:
          callbackId,

        inquiry_id:
          input.inquiryId,

        session_id:
          input.sessionId,

        created_at:
          new Date().toISOString(),

        idempotency_key:
          input.idempotencyKey,

        status:
          "requested",
      },
    );

    return {
      callbackId,
      inquiryId:
        input.inquiryId,
    };
  }

  /**
   * Records a verified Calendly booking
   * as an attributable funnel event.
   */
  async recordAppointment(
    input: AppointmentInput,
  ): Promise<AppointmentRecord | null> {
    const inquiries =
      await this.rows(
        this.tabs.inquiries,
      );

    const inquiryExists =
      inquiries.some(
        (row) =>
          row.inquiry_id ===
          input.inquiryId,
      );

    if (!inquiryExists) {
      return null;
    }

    /**
     * Booking idempotency ensures that a
     * repeated Calendly callback does not
     * create multiple appointment events.
     */
    const events =
      await this.rows(
        this.tabs.events,
      );

    const replay =
      events.find(
        (row) =>
          row.event_name ===
          "appointment_booked" &&
          row.idempotency_key ===
          input.idempotencyKey,
      );

    if (replay) {
      return {
        appointmentId:
          replay.idempotency_key,

        inquiryId:
          replay.inquiry_id,
      };
    }

    await this.recordEvent(
      {
        eventName:
          "appointment_booked",

        sessionId:
          input.sessionId,

        inquiryId:
          input.inquiryId,

        customerId:
          input.customerId,

        productId:
          input.productId,

        reelId:
          input.reelId,

        campaignId:
          input.campaignId,

        source:
          input.source,

        landingPageVersion:
          input.landingPageVersion,

        metadata: {
          appointmentType:
            input.appointmentType,
        },
      },

      input.idempotencyKey,
    );

    return {
      appointmentId:
        input.idempotencyKey,

      inquiryId:
        input.inquiryId,
    };
  }
}