export const leadFields = [
  { name: "fullName", label: "Full Name", autoComplete: "name", inputMode: "text", placeholder: "Enter your full name" },
  { name: "mobileNumber", label: "Mobile Number", autoComplete: "tel", inputMode: "tel", placeholder: "98765 43210" },
  { name: "pinCode", label: "PIN Code", autoComplete: "postal-code", inputMode: "numeric", placeholder: "6-digit PIN code" },
  { name: "city", label: "City", autoComplete: "address-level2", inputMode: "text", placeholder: "Enter your city" },
] as const;

export const OFFER_CTA_TEXT = "Unlock My 30% Benefit";

export const experienceCopy = {
  announcement: "Private Instagram Benefit",
  announcementDetail: "Up to 30% off making charges",
  offerEyebrow: "Reserved for your Instagram selection",
  offerHeadline: "You found the piece. Now let us make it yours.",
  offerHeadlineLines: ["You found the piece.", "Now let us make it yours."],
  offerLabel: "Up to 30% off on making charges",
  offerDescription:
    "Share your details and an MK Jewels jewellery expert will personally assist you with the piece you discovered on Instagram.",
  /** Scroll-to-form calls to action. Every one targets the same single form. */
  heroCtaText: "Yes, Unlock My Benefit",
  videoCtaText: "Yes, Unlock My 30% Benefit",
  proofCtaEyebrow: "Private Instagram Benefit",
  proofCtaHeading: "Still thinking about the piece you noticed?",
  proofCtaText: "Unlock your making-charge benefit and let our jewellery team assist you personally.",
  proofCtaButton: "Unlock My 30% Benefit",
  midCtaText: "Claim My Making-Charge Benefit",
  stickyCtaText: "Unlock 30% Benefit",
  finalCtaText: "Return to My Benefit",
  ctaMicrocopy: "Four details · Takes under a minute",
  offerCtaText: OFFER_CTA_TEXT,
  formEyebrow: "Your private benefit is ready",
  formHeading: "Let us assist you personally",
  formIntro: "Tell us where to reach you. Your enquiry is linked to the piece you chose on Instagram.",
  privacy: "Your details are shared only with MK Jewels to assist with this enquiry.",
  successHeadline: "Your exclusive benefit is unlocked.",
  successDescription: "Your enquiry has been received.",
  representativeContact:
    "An MK Jewels representative will contact you shortly regarding the jewellery you selected.",
  successFootnote: "Please keep your phone available so our team can assist you.",
  repeatWelcome: "Welcome back.",
} as const;

/**
 * Optional real campaign end date (ISO 8601). Leave null unless MK Jewels has
 * confirmed an actual expiry; never add an artificial deadline or countdown.
 */
export const offerValidUntil: string | null = null;

/**
 * Truthful enquiry proof. The number always comes from accepted inquiries in
 * the repository; the page never generates, pads or animates a fake count.
 * `enabled`, `mode`, `recentWindowHours`, `allowLiveLabel` and `minimumCount`
 * are overridden at runtime by the SHOW_INQUIRY_COUNT / INQUIRY_COUNT_* env vars.
 * This per-selection count is separate from static trust metrics.
 */
export const inquiryProofConfig = {
  enabled: true,
  /** "total": all accepted inquiries. "recent": only within `recentWindowHours`. */
  mode: "total" as "total" | "recent",
  /** "selection": exact product+Reel+campaign. "product": any Reel/campaign for the piece. */
  scope: "selection" as "selection" | "product",
  recentWindowHours: 24,
  /** Counts below this are hidden rather than shown as weak proof. */
  minimumCount: 1,
  /**
   * The "LIVE" marker is only rendered when mode is "recent" AND this is true,
   * because only a recent-window measurement describes current activity.
   */
  allowLiveLabel: false,
  /**
   * Independently audited historical count from another system. Only set with
   * written approval; see docs/CONTENT_ASSETS.md. When set (total mode only), the
   * displayed number is `count` + accepted inquiries created since `asOf`.
   */
  auditedBaseline: null as null | { count: number; asOf: string; approvalReference: string },
};

/**
 * Self-hosted brand film. Drop the approved file at `src` (and an optional
 * poster at `poster`) under /public and it is picked up automatically. The
 * NEXT_PUBLIC_BRAND_VIDEO_URL env var (hosted MP4/YouTube/Vimeo) takes priority.
 */
export const brandVideoConfig = {
  /** Used automatically in development when NEXT_PUBLIC_BRAND_VIDEO_URL is unset. */
  src: "/brand/mk-jewels-intro.mp4",
  poster: "/brand/video-poster.jpg",
  title: "A look inside MK Jewels",
  eyebrow: "Inside MK Jewels",
  headingLines: ["Crafted with care.", "Chosen with confidence."],
  description: "Step inside the world of MK Jewels before our team assists you with the piece you chose.",
  /** CSS aspect ratio of the supplied film, e.g. "16 / 9", "4 / 5", "9 / 16". */
  aspectRatio: "16 / 9",
} as const;

/**
 * Reasons shown in the "why" section. These describe the enquiry service this
 * page actually provides. Add brand claims (craftsmanship, years, stores) only
 * once MK Jewels has approved them.
 */
export const whyReasons = [
  {
    title: "A jewellery expert, personally",
    text: "A member of the MK Jewels team contacts you directly, rather than leaving you to browse alone.",
  },
  {
    title: "Your selection, already known",
    text: "Your enquiry is linked to the piece you discovered on Instagram, so there is nothing to describe again.",
  },
  {
    title: "A benefit reserved for Instagram",
    text: "Enquiries from this private link can unlock up to 30% off making charges on eligible jewellery.",
  },
] as const;

/** The three-step concierge journey explained before the form. */
export const journeySteps = [
  { label: "Unlock", title: "Unlock your making-charge benefit", text: "Share four simple details. No payment is needed to enquire." },
  { label: "Connect", title: "Receive personal assistance", text: "An MK Jewels representative contacts you about your selection." },
  { label: "Explore", title: "Discover the piece with an expert", text: "Ask anything about the jewellery you chose, with your benefit in place." },
] as const;

export const successSteps = [
  { title: "Your enquiry is received", text: "It is recorded with the piece you selected on Instagram." },
  { title: "Our team reviews your selection", text: "An MK Jewels jewellery expert prepares to assist you." },
  { title: "We contact you personally", text: "A representative reaches you on the mobile number you shared." },
] as const;

export const reassurancePoints = [
  { title: "No payment to enquire", text: "Registering your interest is free and without obligation." },
  { title: "Only four details", text: "Name, mobile number, PIN code and city. Nothing more." },
  { title: "Private by design", text: "Your details are used only by MK Jewels for this enquiry." },
] as const;

/** Name of the honeypot control. Hidden from customers and assistive tech. */
export const honeypotField = "company";
