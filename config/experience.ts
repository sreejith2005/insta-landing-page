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
};
