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
  ctaMicrocopy: "Four details · Takes under a minute",
  offerCtaText: OFFER_CTA_TEXT,
  formEyebrow: "Your private benefit is ready",
  formHeading: "Let us assist you personally",
  formIntro: "Tell us where to reach you. Your enquiry is linked to the piece you chose on Instagram.",
  privacy: "Your details are shared only with MK Jewels to assist with this enquiry.",
  successHeadline: "Your exclusive benefit is unlocked.",
  successDescription: "Your enquiry has been received.",
  /** Confirms the benefit without naming, describing or pricing the piece. */
  successDiscountApplied: "Your making-charge discount has been applied to this enquiry.",
  representativeContact:
    "An MK Jewels representative will contact you shortly regarding the jewellery you selected.",
  successFootnote: "Please keep your phone available so our team can assist you.",
  repeatWelcome: "Welcome back.",
} as const;

/**
 * Pre-filled WhatsApp message for the post-enquiry "Chat with us" button.
 * `{productName}` and `{productId}` are filled from the resolved context; the
 * text travels only inside the wa.me link and is never rendered on the page.
 */
export const whatsappMessageTemplate = "Hi, I'm interested in {productName} ({productId})";

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
 * This per-selection count is shown beside the static trust stats in the top
 * trust bar, but is never added to or blended with them.
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
 * The trust bar at the very top of the page: live enquiry count plus the static
 * stats from `config/trust-stats.ts`. More than `maxStats` stats are cut off.
 */
export const trustBarConfig = {
  label: "MK Jewels in numbers",
  maxStats: 4,
} as const;

/**
 * Self-hosted brand film: `src` (and optional `poster`) are /public paths and
 * must be committed. The NEXT_PUBLIC_BRAND_VIDEO_URL env var (hosted
 * MP4/YouTube/Vimeo) takes priority. Set `src` to "" to hide the section.
 */
export const brandVideoConfig = {
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
 * Second film, shown below the enquiry form / success state. Same rules as the
 * brand film (NEXT_PUBLIC_SECOND_VIDEO_URL wins). Empty until a file is added
 * under /public/brand — set `src` (and `poster`) then. Plays only when pressed.
 */
export const secondVideoConfig = {
  src: "",
  poster: "",
  title: "MK Jewels high jewellery",
  eyebrow: "The MK Jewels collection",
  headingLines: ["Made to be noticed.", "Made to be kept."],
  description: "A closer look at the craftsmanship behind every MK Jewels piece.",
  aspectRatio: "16 / 9",
} as const;

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

/**
 * Name of the honeypot control. Hidden from customers and assistive tech.
 * Deliberately not an autofill-recognisable name ("company", "organization",
 * "website"…): browsers autofill those even in hidden inputs, which used to
 * reject genuine customers.
 */
export const honeypotField = "mkj_hp_ref";
