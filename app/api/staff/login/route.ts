import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/config/env";
import { enforceRateLimit, guardMutationRequest, readJsonBody, RequestBodyError } from "@/lib/http/route";
import { logEvent } from "@/lib/log";
import { repository } from "@/lib/providers/repository";
import { staffLoginSchema } from "@/lib/staff/schemas";
import { checkStorePin, createStaffSession, staffCookieName, staffCookieOptions } from "@/lib/staff/session";

export async function POST(request: Request) {
  const guarded = guardMutationRequest(request, { requireOrigin: true }) ?? (await enforceRateLimit(request, "staffLogin"));
  if (guarded) return guarded;
  const env = serverEnv();
  const secret = env.passes.secret;
  if (!secret) return NextResponse.json({ ok: false, message: "Store passes are switched off." }, { status: 503 });
  try {
    const parsed = staffLoginSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Choose your store, and enter the PIN and your name." }, { status: 400 });
    }
    const { store: storeName, pin, staffName } = parsed.data;
    const store = checkStorePin(await (await repository()).listStores(), storeName, pin);
    if (!store) {
      logEvent("staff.login_failed", { store: storeName });
      return NextResponse.json({ ok: false, message: "Wrong store PIN." }, { status: 401 });
    }
    const production = env.nodeEnv === "production";
    const response = NextResponse.json({ ok: true });
    response.cookies.set(staffCookieName(production), createStaffSession(store, staffName, secret), staffCookieOptions(production));
    logEvent("staff.login", { store: store.name });
    return response;
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, message: "Please send a valid request." }, { status: error.status });
    console.error("Staff login failed:", (error as Error).message);
    return NextResponse.json({ ok: false, message: "Could not reach the store list. Please try again." }, { status: 503 });
  }
}
