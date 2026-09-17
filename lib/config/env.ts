import { z } from "zod";

const optionalHttpsUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || /^https:\/\/[^\s]+$/.test(value), {
    message: "must be an https:// URL",
  });

const rawSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATA_PROVIDER: z.enum(["preview", "google-sheets"]).default("preview"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_LANDING_PAGE_VERSION: z.string().trim().min(1).max(64).default("phase1"),
  NEXT_PUBLIC_OFFER_UNLOCKED_COPY: z.string().trim().max(240).optional(),
  NEXT_PUBLIC_REPRESENTATIVE_CONTACT_COPY: z.string().trim().max(320).optional(),
  NEXT_PUBLIC_BRAND_VIDEO_URL: optionalHttpsUrl,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().trim().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SPREADSHEET_ID: z.string().trim().optional(),
  GOOGLE_PRODUCT_SHEET: z.string().trim().default("Product_Master"),
  GOOGLE_CUSTOMER_SHEET: z.string().trim().default("Customers"),
  GOOGLE_INQUIRY_SHEET: z.string().trim().default("Inquiries"),
  GOOGLE_EVENT_SHEET: z.string().trim().default("Events"),
  ASSISTED_SUPPORT_URL: optionalHttpsUrl,
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
    },
    google: {
      serviceAccountEmail: raw.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: raw.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      spreadsheetId: raw.GOOGLE_SPREADSHEET_ID,
      sheets: {
        products: raw.GOOGLE_PRODUCT_SHEET,
        customers: raw.GOOGLE_CUSTOMER_SHEET,
        inquiries: raw.GOOGLE_INQUIRY_SHEET,
        events: raw.GOOGLE_EVENT_SHEET,
      },
    },
    assistedSupportUrl: raw.ASSISTED_SUPPORT_URL,
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
    ...env.public,
  };
}
