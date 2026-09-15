import { NextResponse } from "next/server";

import { submitLead } from "@/lib/leads/submit-lead";
import { repository } from "@/lib/providers/repository";
import { leadSubmissionSchema } from "@/lib/validation/schemas";
import { enforceRateLimit, guardMutationRequest, readJsonBody, RequestBodyError } from "@/lib/http/route";

export async function POST(request: Request) {
  const guarded = guardMutationRequest(request) ?? await enforceRateLimit(request, "lead");
  if (guarded) return guarded;
  try {
    const parsed = leadSubmissionSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Please check your details and try again.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const result = await submitLead(parsed.data, await repository());
    return NextResponse.json(result, { status: result.ok ? 201 : result.code === "service_unavailable" ? 503 : 409 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, message: "Please send a valid request." }, { status: error.status });
    return NextResponse.json({ ok: false, message: "We could not save your details. Please try again." }, { status: 503 });
  }
}
