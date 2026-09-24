import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/config/env";
import { guardMutationRequest } from "@/lib/http/route";
import { staffCookieName, staffCookieOptions } from "@/lib/staff/session";

export async function POST(request: Request) {
  const guarded = guardMutationRequest(request, { requireOrigin: true });
  if (guarded) return guarded;
  const production = serverEnv().nodeEnv === "production";
  const response = NextResponse.json({ ok: true });
  response.cookies.set(staffCookieName(production), "", { ...staffCookieOptions(production), maxAge: 0 });
  return response;
}
