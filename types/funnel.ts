export type IncomingInstagramContext = {
  productId: string;
  reelId: string;
  campaignId: string;
  contextToken?: string;
};

export type Specification = { label: string; value: string };

export type PublicProductContext = {
  productId: string;
  productName: string;
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
  ctas: {
    whatsappEnabled: boolean;
    callbackEnabled: boolean;
    order: Array<"store_visit" | "video_consultation" | "whatsapp" | "callback">;
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
