import { z } from "zod";

const httpsUrl = z
  .string()
  .trim()
  .regex(/^https:\/\/[^\s]+$/)
  .optional()
  .transform((value) => (value ? value : undefined));

const rawSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATA_PROVIDER: z.enum(["preview", "google-sheets"]).default("preview"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_LANDING_PAGE_VERSION: z.string().trim().min(1).max(64).default("phase1"),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().trim().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SPREADSHEET_ID: z.string().trim().optional(),
  GOOGLE_PRODUCT_SHEET: z.string().trim().default("Product_Master"),
  GOOGLE_CUSTOMER_SHEET: z.string().trim().default("Customers"),
  GOOGLE_INQUIRY_SHEET: z.string().trim().default("Inquiries"),
  GOOGLE_EVENT_SHEET: z.string().trim().default("Events"),
  GOOGLE_CALLBACK_SHEET: z.string().trim().default("Callback_Requests"),
  CALENDLY_STORE_VISIT_URL: httpsUrl,
  CALENDLY_VIDEO_URL: httpsUrl,
  /** Disabled by default; enable only once Calendly booking events are verified. */
  CALENDLY_CAPTURE_BOOKINGS: z.enum(["true", "false"]).default("false"),
  WHATSAPP_NUMBER: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{7,14}$/)
    .optional()
    .transform((value) => (value ? value : undefined)),
  WHATSAPP_MESSAGE_TEMPLATE: z.string().trim().max(400).optional(),
  ASSISTED_SUPPORT_URL: httpsUrl,
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
    google: {
      serviceAccountEmail: raw.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: raw.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      spreadsheetId: raw.GOOGLE_SPREADSHEET_ID,
      sheets: {
        products: raw.GOOGLE_PRODUCT_SHEET,
        customers: raw.GOOGLE_CUSTOMER_SHEET,
        inquiries: raw.GOOGLE_INQUIRY_SHEET,
        events: raw.GOOGLE_EVENT_SHEET,
        callbacks: raw.GOOGLE_CALLBACK_SHEET,
      },
    },
    calendly: {
      storeVisitUrl: raw.CALENDLY_STORE_VISIT_URL,
      videoConsultationUrl: raw.CALENDLY_VIDEO_URL,
      captureBookings: raw.CALENDLY_CAPTURE_BOOKINGS === "true",
    },
    whatsapp: {
      number: raw.WHATSAPP_NUMBER,
      messageTemplate: raw.WHATSAPP_MESSAGE_TEMPLATE,
    },
    assistedSupportUrl: raw.ASSISTED_SUPPORT_URL,
  } as const;
}

export function serverEnv() {
  return parseServerEnv(process.env);
}

/**
 * Experience defaults applied when a Product Master row leaves a field blank.
 * Product/campaign values always win over these global fallbacks.
 */
export function experienceDefaults(env: ServerEnv = serverEnv()) {
  return {
    calendly: {
      storeVisitUrl: env.calendly.storeVisitUrl,
      videoConsultationUrl: env.calendly.videoConsultationUrl,
    },
    whatsapp: {
      number: env.whatsapp.number,
      messageTemplate: env.whatsapp.messageTemplate,
    },
  };
}

export function publicEnv() {
  const env = serverEnv();
  return {
    appUrl: env.appUrl,
    landingPageVersion: env.landingPageVersion,
    isPreview: env.dataProvider === "preview",
    captureBookings: env.calendly.captureBookings,
  };
}
