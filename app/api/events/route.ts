import { NextResponse } from "next/server";

import { recordEvent } from "@/lib/analytics/record-event";
import { repository } from "@/lib/providers/repository";
import { eventSchema } from "@/lib/validation/schemas";
import { enforceRateLimit, guardMutationRequest, readJsonBody, RequestBodyError } from "@/lib/http/route";

export async function POST(request: Request) {
  const guarded = guardMutationRequest(request) ?? await enforceRateLimit(request, "events");
  if (guarded) return guarded;
  try {
    const parsed = eventSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    return NextResponse.json(await recordEvent(parsed.data, await repository()), { status: 202 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false }, { status: error.status });
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
