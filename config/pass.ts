/**
 * The store pass shown after an enquiry. Every enquiry gets its own code, so a
 * visit or purchase is always traced back to the exact Reel and campaign.
 */
export const passConfig = {
  /** Start of every code, e.g. "MK30-7KQ4-X9MP". Change it for a different offer. */
  codePrefix: "MK30",
  title: "MK Jewels Store Pass",
  benefit: "30% off making charges",
  /** The button under WhatsApp on the thank-you screen. */
  revealLabel: "Planning to visit our store?",
  revealHint: "Get your store pass to claim your benefit",
  instructions: "Show this pass at any MK Jewels store to claim your benefit.",
  screenshotHint: "Take a screenshot to keep it handy.",
  /** Appended to the pre-filled WhatsApp message, so the CRM team sees the code. */
  whatsappSuffix: ". My MK Jewels code is {passCode}.",
} as const;
