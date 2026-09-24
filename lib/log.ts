/**
 * One JSON line per business event, readable in Vercel's logs. Callers pass
 * IDs and codes only — never names, phone numbers or other lead PII.
 */
export function logEvent(event: string, fields: Record<string, string | number | boolean | undefined> = {}) {
  console.log(JSON.stringify({ event, ...fields }));
}
