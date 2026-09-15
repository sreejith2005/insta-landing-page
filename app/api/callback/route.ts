import { NextResponse } from "next/server";

import { requestCallback } from "@/lib/callbacks/request-callback";
import { repository } from "@/lib/providers/repository";
import { callbackSchema } from "@/lib/validation/schemas";
import { enforceRateLimit, guardMutationRequest, readJsonBody, RequestBodyError } from "@/lib/http/route";

export async function POST(request: Request) {
  const guarded = guardMutationRequest(request) ?? await enforceRateLimit(request, "callback");
  if (guarded) return guarded;
  try {
    const parsed = callbackSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return NextResponse.json({ ok: false, message: "We could not verify this enquiry." }, { status: 400 });
    const result = await requestCallback(parsed.data, await repository());
    return NextResponse.json(result, { status: result.ok ? 201 : result.code === "invalid_inquiry" ? 409 : 503 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, message: "Please send a valid request." }, { status: error.status });
    return NextResponse.json({ ok: false, message: "We could not request a callback. Please try again." }, { status: 503 });
  }
}
