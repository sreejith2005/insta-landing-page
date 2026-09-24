import type { IssuedPass } from "@/lib/leads/contracts";
import { passToken } from "./code";
import { passValidUntil } from "./format";

export type PassSettings = { secret: string; codePrefix: string; validityDays: number };

export function passPath(code: string, secret: string) {
  return `/p/${passToken(code, secret)}`;
}

/**
 * The QR image for a pass link. The `v` changes whenever what the QR encodes
 * changes, so no browser reuses a saved copy of an older QR.
 */
export function passQrSrc(path: string) {
  return `${path}/qr?v=2`;
}

/** What the customer's browser receives: the code and same-site links only. */
export function issuedPass(code: string, issuedAt: string, settings: PassSettings): IssuedPass {
  const path = passPath(code, settings.secret);
  return {
    code,
    path,
    qrPath: passQrSrc(path),
    validUntil: passValidUntil(issuedAt, settings.validityDays).toISOString(),
  };
}
