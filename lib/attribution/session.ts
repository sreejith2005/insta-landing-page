const sessionKey = "mkj_funnel_session";

export function getSessionId() {
  if (typeof window === "undefined") return "";
  const stored = window.sessionStorage.getItem(sessionKey);
  if (stored) return stored;
  const created = globalThis.crypto.randomUUID();
  window.sessionStorage.setItem(sessionKey, created);
  return created;
}
