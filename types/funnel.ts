/**
 * The approved Reel/campaign/product triple. This identifies a product mapping
 * and is deliberately separate from the customer-supplied context below, so a
 * Product Master record never carries session or attribution data.
 */
export type ProductMapping = {
  productId: string;
  reelId: string;
  campaignId: string;
};

/** Where the customer entered the funnel. Restricted to an approved allowlist. */
export type FunnelSource = "instagram" | "manychat" | "whatsapp" | "direct";

/** Optional marketing attribution forwarded by ManyChat; never customer-entered. */
export type UtmAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export type IncomingInstagramContext = ProductMapping &
  UtmAttribution & {
    source: FunnelSource;
    contextToken?: string;
  };

export type Specification = { label: string; value: string };

export type AppointmentType = "store_visit" | "video_consultation";

export type CtaName = AppointmentType | "whatsapp" | "callback";

export type PublicProductContext = {
  productId: string;
  productName: string;
  category?: string;
  collection?: string;
  /** Position of this product within a multi-product Reel, when applicable. */
  productPosition?: number;
  productImage: {
    src: string;
    alt: string;
    width: number;
    height: number;
  } | null;
  specifications: Specification[];
  campaign: {
    campaignId: string;
    offerCopy?: string;
    offerExpiresAt?: string;
  };
  calendly: {
    storeVisitUrl?: string;
    videoConsultationUrl?: string;
  };
  whatsapp: {
    number?: string;
    messageTemplate?: string;
  };
  ctas: {
    whatsappEnabled: boolean;
    callbackEnabled: boolean;
    order: CtaName[];
  };
};

export type LeadFields = {
  fullName: string;
  mobileNumber: string;
  pinCode: string;
  city: string;
};

export type AcceptedInquiry = {
  inquiryId: string;
  customerId: string;
  isRepeatCustomer: boolean;
  product: PublicProductContext;
};

export type FunnelEventName =
  | "landing_view"
  | "product_context_resolved"
  | "product_context_failed"
  | "form_started"
  | "form_validation_failed"
  | "form_submitted"
  | "repeat_customer_detected"
  | "product_revealed"
  | "calendly_opened"
  | "store_visit_selected"
  | "video_consultation_selected"
  | "appointment_booked"
  | "whatsapp_clicked"
  | "callback_requested";
