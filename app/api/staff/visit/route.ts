import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/config/env";
import { enforceRateLimit, guardMutationRequest, readJsonBody, RequestBodyError } from "@/lib/http/route";
import { normalizePassCode } from "@/lib/passes/code";
import { recordStoreVisit } from "@/lib/passes/record-store-visit";
import { repository } from "@/lib/providers/repository";
import { currentStaff } from "@/lib/staff/current";
import { storeVisitSchema } from "@/lib/staff/schemas";

const statusFor = { not_found: 404, expired: 409, already_used: 409, missing_invoice: 400 } as const;

export async function POST(request: Request) {
  const guarded = guardMutationRequest(request, { requireOrigin: true }) ?? (await enforceRateLimit(request, "staffAction"));
  if (guarded) return guarded;
  try {
    const data = await repository();
    const staff = await currentStaff(data);
    if (!staff) return NextResponse.json({ ok: false, message: "Please log in again." }, { status: 401 });

    const parsed = storeVisitSchema.safeParse(await readJsonBody(request));
    const code = parsed.success ? normalizePassCode(parsed.data.code) : null;
    if (!parsed.success || !code) {
      const message = parsed.success ? "That is not a valid pass code." : parsed.error.issues[0]?.message;
      return NextResponse.json({ ok: false, message: message ?? "Please check the details." }, { status: 400 });
    }

    const result = await recordStoreVisit(
      { passCode: code, action: parsed.data.action, invoiceNumber: parsed.data.invoiceNumber, billAmount: parsed.data.billAmount },
      staff,
      data,
      serverEnv().passes.validityDays,
    );
    if (!result.ok) return NextResponse.json(result, { status: statusFor[result.code] });
    return NextResponse.json({ ok: true, replay: result.replay }, { status: result.replay ? 200 : 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, message: "Please send a valid request." }, { status: error.status });
    // Nothing was confirmed to the staff member, so they retry; a repeat is recognised.
    console.error("Store visit write failed:", (error as Error).message);
    return NextResponse.json({ ok: false, message: "Could not save. Check the connection and try again." }, { status: 503 });
  }
}
