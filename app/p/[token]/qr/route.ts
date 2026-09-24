import QRCode from "qrcode";

import { serverEnv } from "@/lib/config/env";
import { verifyPassToken } from "@/lib/passes/code";
import { publicOrigin } from "@/lib/passes/origin";

/**
 * The pass QR as an SVG, drawn on the server so the customer's page ships no
 * QR code library. It encodes the pass page's full address, so any phone
 * camera opens it; staff who are logged in land on the verification screen.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const env = serverEnv();
  if (!env.passes.secret || !verifyPassToken(token, env.passes.secret)) {
    return new Response("Not found", { status: 404 });
  }
  const url = `${publicOrigin(request.headers, env.appUrl)}/p/${token}`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#1c1917", light: "#ffffff" },
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      // A token's QR never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
