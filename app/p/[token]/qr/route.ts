import QRCode from "qrcode";

import { serverEnv } from "@/lib/config/env";
import { verifyPassToken } from "@/lib/passes/code";
import { publicOrigin } from "@/lib/passes/origin";

/**
 * The pass QR as an SVG, drawn on the server so the customer's page ships no
 * QR code library. Only store staff scan it, so it opens the staff check
 * screen for this code (login first, if the phone is not logged in yet).
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const env = serverEnv();
  const code = env.passes.secret ? verifyPassToken(token, env.passes.secret) : null;
  if (!code) return new Response("Not found", { status: 404 });
  const url = `${publicOrigin(request.headers, env.appUrl)}/staff?code=${code}`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#1c1917", light: "#ffffff" },
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      // Short on purpose: what a QR opens has changed before (see passQrSrc).
      "Cache-Control": "public, max-age=3600",
    },
  });
}
