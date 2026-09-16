export const leadFields = [
  { name: "fullName", label: "Full Name", autoComplete: "name", inputMode: "text", placeholder: "Enter your full name" },
  { name: "mobileNumber", label: "Mobile Number", autoComplete: "tel", inputMode: "tel", placeholder: "98765 43210" },
  { name: "pinCode", label: "PIN Code", autoComplete: "postal-code", inputMode: "numeric", placeholder: "Enter your PIN code" },
  { name: "city", label: "City", autoComplete: "address-level2", inputMode: "text", placeholder: "Enter your city" },
] as const;

export const experienceCopy = {
  heading: "Your selected piece is waiting",
  introduction: "Share your details to privately view the design you chose on Instagram.",
  submit: "Unlock my selected piece",
  privacy: "Your details are used only to assist with this enquiry.",
  repeatWelcome: "Welcome back. We have added this piece to your enquiries.",
};

export const appointmentCopy: Record<
  "store_visit" | "video_consultation",
  { label: string; description: string }
> = {
  store_visit: {
    label: "Store Visit",
    description: "See the piece in person with a jewellery expert.",
  },
  video_consultation: {
    label: "Video Consultation",
    description: "Explore the design live from wherever you are.",
  },
};

/**
 * Default WhatsApp wording. `WHATSAPP_MESSAGE_TEMPLATE` or a Product Master row
 * overrides it. Placeholders are replaced with non-sensitive references only.
 */
export const defaultWhatsappTemplate =
  "Hello MK Jewels, I would like to know more about {productName} ({productId}). My enquiry reference is {inquiryId}.";

/** Name of the honeypot control. Hidden from customers and assistive tech. */
export const honeypotField = "company";
