import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/http/route";
import { lookupPinCode } from "@/lib/pincode/lookup-pin-code";
import { PIN_CODE } from "@/lib/validation/lead-fields";

/**
 * Same-origin proxy to India Post's PIN directory, so the browser never needs a
 * CSP `connect-src` exception, and lookups are cached server-side.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!PIN_CODE.test(code)) {
    return NextResponse.json({ ok: false, message: "Enter a valid six-digit PIN code." }, { status: 400 });
  }
  const limited = await enforceRateLimit(request, "pincode");
  if (limited) return limited;

  try {
    const location = await lookupPinCode(code);
    if (!location) {
      return NextResponse.json({ ok: false, message: "PIN code not found." }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, city: location.city, state: location.state },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } },
    );
  } catch (error) {
    console.error("PIN code lookup failed:", error);
    return NextResponse.json({ ok: false, message: "PIN code lookup is unavailable." }, { status: 503 });
  }
}
