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

/** Internal Product_Master record. Product data is attribution, never UI. */
export type AttributionMapping = ProductMapping & {
  productName: string;
  productPosition?: number;
  category?: string;
  collection?: string;
  campaignName?: string;
  active: boolean;
};

export type ResolvedAttributionContext = Omit<AttributionMapping, "active">;

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
};

export type FunnelEventName =
  | "landing_view"
  | "context_resolved"
  | "context_failed"
  | "form_started"
  | "form_validation_failed"
  | "form_submitted"
  | "repeat_customer_detected"
  | "offer_unlocked";
