const DAY_MS = 24 * 60 * 60 * 1000;

/** The pass stops being valid this many days after it was issued. */
export function passValidUntil(issuedAt: string, validityDays: number) {
  const issued = Date.parse(issuedAt);
  return new Date((Number.isFinite(issued) ? issued : Date.now()) + validityDays * DAY_MS);
}

/** "23 Nov 2026", in India Standard Time. */
export function formatPassDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/** "27 Sep 2026, 4:12 pm", in India Standard Time. */
export function formatPassDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/** "3210" from any stored phone format. */
export function phoneLastFour(phone: string) {
  return phone.replace(/\D/g, "").slice(-4);
}
