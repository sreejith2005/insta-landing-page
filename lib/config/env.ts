import { z } from "zod";

const optionalHttpsUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || /^https:\/\/[^\s]+$/.test(value), {
    message: "must be an https:// URL",
  });

/** HTTPS URL, or a root-relative path to a file served from /public. */
const optionalMediaUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine(
    (value) =>
      value === undefined ||
      /^https:\/\/[^\s]+$/.test(value) ||
      /^\/(?!\/)[A-Za-z0-9._/-]+$/.test(value),
    { message: "must be an https:// URL or a /public path" },
  );

/**
 * WhatsApp number in international format without "+", e.g. 919876543210.
 * Spaces, dashes, brackets and a leading "+" are tolerated and stripped.
 */
const optionalWhatsAppNumber = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.replace(/[\s()+-]/g, "") : undefined))
  .refine((value) => value === undefined || /^[1-9]\d{9,14}$/.test(value), {
    message: "must be a WhatsApp number with country code, e.g. 919876543210",
  });

/** Site-wide Calendly scheduling link; must be a plain https://calendly.com/... URL to embed. */
const optionalCalendlyUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || /^https:\/\/calendly\.com\/[^\s"'<>]+$/.test(value), {
    message: "must be an https://calendly.com/... scheduling link",
  });

/** Comma-separated Calendly event type URIs, e.g. https://api.calendly.com/event_types/AAAA. */
const eventTypeUris = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ?? "").split(",").map((uri) => uri.trim()).filter(Boolean))
  .refine((uris) => uris.every((uri) => /^https:\/\/api\.calendly\.com\/event_types\/[A-Za-z0-9-]+$/.test(uri)), {
    message: "must be comma-separated https://api.calendly.com/event_types/... URIs",
  });

const rawSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATA_PROVIDER: z.enum(["preview", "google-sheets"]).default("preview"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_LANDING_PAGE_VERSION: z.string().trim().min(1).max(64).default("phase1"),
  NEXT_PUBLIC_OFFER_UNLOCKED_COPY: z.string().trim().max(240).optional(),
  NEXT_PUBLIC_REPRESENTATIVE_CONTACT_COPY: z.string().trim().max(320).optional(),
  NEXT_PUBLIC_BRAND_VIDEO_URL: optionalMediaUrl,
  /** Second film below the funnel. Same formats as the brand film. */
  NEXT_PUBLIC_SECOND_VIDEO_URL: optionalMediaUrl,
  SHOW_INQUIRY_COUNT: z.enum(["true", "false"]).default("true"),
  INQUIRY_COUNT_MODE: z.enum(["total", "recent"]).default("total"),
  INQUIRY_COUNT_RECENT_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  /** Only honoured in recent mode. */
  INQUIRY_COUNT_SHOW_LIVE: z.enum(["true", "false"]).default("false"),
  /** Counts below this are hidden. Zero is always hidden. */
  INQUIRY_COUNT_MINIMUM: z.coerce.number().int().min(1).default(1),
  /** Development design review only. Forced off when NODE_ENV is production. */
  SHOW_DEVELOPMENT_SOCIAL_PROOF: z.enum(["true", "false"]).optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().trim().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SPREADSHEET_ID: z.string().trim().optional(),
  GOOGLE_PRODUCT_SHEET: z.string().trim().default("Products"),
  /** Reel/campaign → product mapping tab. Set to an empty value to use the flat product tab alone. */
  GOOGLE_REEL_MAP_SHEET: z.string().trim().default("Reel_Product_Map"),
  GOOGLE_CUSTOMER_SHEET: z.string().trim().default("Customers"),
  GOOGLE_INQUIRY_SHEET: z.string().trim().default("Inquiries"),
  GOOGLE_EVENT_SHEET: z.string().trim().default("Events"),
  /** Operations copy of each new lead. Set to an empty value to disable the dual-write. */
  GOOGLE_INSTAGRAM_FMS_SHEET: z.string().trim().default("Instagram_FMS"),
  /** Calendly bookings logged by the webhook. */
  GOOGLE_BOOKINGS_SHEET: z.string().trim().default("Bookings"),
  /** Webhook subscription signing key. Unset disables the Calendly webhook (503). */
  CALENDLY_WEBHOOK_SIGNING_KEY: z.string().trim().optional().transform((value) => value || undefined),
  /** Event types that are video calls / store visits; decides each booking's `booking_type`. */
  CALENDLY_VIDEO_EVENT_TYPES: eventTypeUris,
  CALENDLY_STORE_EVENT_TYPES: eventTypeUris,
  /** Default booking links, used when the product row has no calendly_video_url / calendly_store_url. */
  CALENDLY_VIDEO_URL: optionalCalendlyUrl,
  CALENDLY_STORE_URL: optionalCalendlyUrl,
  /** Alternative name for CALENDLY_STORE_URL; CALENDLY_STORE_URL wins when both are set. */
  CALENDLY_STORE_VISIT_URL: optionalCalendlyUrl,
  ASSISTED_SUPPORT_URL: optionalHttpsUrl,
  /** CRM WhatsApp number for the post-enquiry "Chat with us" button. Unset hides the button. */
  CRM_WHATSAPP_NUMBER: optionalWhatsAppNumber,
  UPSTASH_REDIS_REST_URL: optionalHttpsUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().trim().optional(),
});

export type ServerEnv = ReturnType<typeof parseServerEnv>;

export function parseServerEnv(input: Record<string, string | undefined>) {
  const raw = rawSchema.parse(input);

  if (raw.NODE_ENV === "production" && raw.DATA_PROVIDER === "preview") {
    throw new Error("The preview provider cannot run in production.");
  }

  if (
    raw.DATA_PROVIDER === "google-sheets" &&
    (!raw.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !raw.GOOGLE_PRIVATE_KEY ||
      !raw.GOOGLE_SPREADSHEET_ID)
  ) {
    throw new Error("Google Sheets configuration is incomplete.");
  }

  return {
    nodeEnv: raw.NODE_ENV,
    dataProvider: raw.DATA_PROVIDER,
    appUrl: raw.NEXT_PUBLIC_APP_URL,
    landingPageVersion: raw.NEXT_PUBLIC_LANDING_PAGE_VERSION,
    public: {
      offerUnlockedCopy: raw.NEXT_PUBLIC_OFFER_UNLOCKED_COPY,
      representativeContactCopy: raw.NEXT_PUBLIC_REPRESENTATIVE_CONTACT_COPY,
      brandVideoUrl: raw.NEXT_PUBLIC_BRAND_VIDEO_URL,
      secondVideoUrl: raw.NEXT_PUBLIC_SECOND_VIDEO_URL,
    },
    google: {
      serviceAccountEmail: raw.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: raw.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      spreadsheetId: raw.GOOGLE_SPREADSHEET_ID,
      sheets: {
        products: raw.GOOGLE_PRODUCT_SHEET,
        reelMap: raw.GOOGLE_REEL_MAP_SHEET || undefined,
        customers: raw.GOOGLE_CUSTOMER_SHEET,
        inquiries: raw.GOOGLE_INQUIRY_SHEET,
        events: raw.GOOGLE_EVENT_SHEET,
        instagramFms: raw.GOOGLE_INSTAGRAM_FMS_SHEET || undefined,
        bookings: raw.GOOGLE_BOOKINGS_SHEET,
      },
    },
    assistedSupportUrl: raw.ASSISTED_SUPPORT_URL,
    crmWhatsappNumber: raw.CRM_WHATSAPP_NUMBER,
    calendly: {
      webhookSigningKey: raw.CALENDLY_WEBHOOK_SIGNING_KEY,
      eventTypes: {
        videoCall: raw.CALENDLY_VIDEO_EVENT_TYPES,
        storeVisit: raw.CALENDLY_STORE_EVENT_TYPES,
      },
      defaultLinks: {
        videoUrl: raw.CALENDLY_VIDEO_URL,
        storeUrl: raw.CALENDLY_STORE_URL ?? raw.CALENDLY_STORE_VISIT_URL,
      },
    },
    inquiryCount: {
      enabled: raw.SHOW_INQUIRY_COUNT === "true",
      mode: raw.INQUIRY_COUNT_MODE,
      recentWindowHours: raw.INQUIRY_COUNT_RECENT_HOURS,
      allowLiveLabel: raw.INQUIRY_COUNT_MODE === "recent" && raw.INQUIRY_COUNT_SHOW_LIVE === "true",
      minimumCount: raw.INQUIRY_COUNT_MINIMUM,
    },
    // Placeholder proof: on by default in `next dev`, opt-in for other
    // non-production runs, and impossible in production.
    showDevelopmentSocialProof:
      raw.NODE_ENV !== "production" &&
      (raw.SHOW_DEVELOPMENT_SOCIAL_PROOF ?? (raw.NODE_ENV === "development" ? "true" : "false")) === "true",
    rateLimit: {
      upstashUrl: raw.UPSTASH_REDIS_REST_URL,
      upstashToken: raw.UPSTASH_REDIS_REST_TOKEN,
    },
  } as const;
}

export function serverEnv() {
  return parseServerEnv(process.env);
}

export function publicEnv() {
  const env = serverEnv();
  return {
    appUrl: env.appUrl,
    landingPageVersion: env.landingPageVersion,
    isPreview: env.dataProvider === "preview",
    showDevelopmentSocialProof: env.showDevelopmentSocialProof,
    ...env.public,
  };
}
