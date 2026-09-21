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

/** A Reel-level link: the Reel and campaign, before any product is chosen. */
export type ReelMapping = Omit<ProductMapping, "productId">;

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

/** The Instagram DM that led here, forwarded by ManyChat. Lead data only, never an event. */
export type InstagramDmContext = {
  instagramUsername?: string;
  /** ISO 8601. */
  dmReceivedAt?: string;
};

/** Internal Product_Master record. Product data is attribution, never UI. */
export type AttributionMapping = ProductMapping & {
  productName: string;
  productPosition?: number;
  category?: string;
  collection?: string;
  campaignName?: string;
  /** Written to the Instagram FMS tab; never rendered. */
  imageUrl?: string;
  /** Per-product booking links, offered only after the lead is saved. */
  calendlyStoreUrl?: string;
  calendlyVideoUrl?: string;
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
  | "offer_unlocked"
  | "calendly_video_call_opened"
  | "calendly_store_visit_opened"
  | "calendly_date_time_selected"
  | "calendly_event_scheduled"
  | "whatsapp_contact_clicked"
  | "product_picker_shown"
  | "product_picker_selected";
