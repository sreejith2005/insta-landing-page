export const leadFields = [
  { name: "fullName", label: "Full Name", autoComplete: "name", inputMode: "text", placeholder: "Enter your full name" },
  { name: "mobileNumber", label: "Mobile Number", autoComplete: "tel", inputMode: "tel", placeholder: "98765 43210" },
  { name: "pinCode", label: "PIN Code", autoComplete: "postal-code", inputMode: "numeric", placeholder: "Enter your PIN code" },
  { name: "city", label: "City", autoComplete: "address-level2", inputMode: "text", placeholder: "Enter your city" },
] as const;

export const experienceCopy = {
  heading: "Share your details with MK Jewels",
  introduction: "Tell us how to reach you about the piece you enquired about.",
  submit: "Unlock my offer",
  privacy: "Your details are used only to assist with this enquiry.",
  offerUnlocked: "Your promotional offer has been unlocked.",
  representativeContact:
    "An MK Jewels representative will contact you shortly regarding your enquiry.",
  repeatWelcome: "Welcome back. We have added this enquiry to your customer record.",
} as const;

/** Empty until MK Jewels supplies and approves factual metrics. */
export const approvedTrustMetrics = [] as const;

/** Name of the honeypot control. Hidden from customers and assistive tech. */
export const honeypotField = "company";
