import { NextResponse } from "next/server";

import { recordBooking } from "@/lib/appointments/record-booking";
import { serverEnv } from "@/lib/config/env";
import { repository } from "@/lib/providers/repository";
import { appointmentSchema } from "@/lib/validation/schemas";
import {
  enforceRateLimit,
  guardMutationRequest,
  readJsonBody,
  RequestBodyError,
} from "@/lib/http/route";

export async function POST(request: Request) {
  const guarded = guardMutationRequest(request) ?? (await enforceRateLimit(request, "appointment"));
  if (guarded) return guarded;

  // Booking capture stays off until a real Calendly event contract is verified.
  if (!serverEnv().calendly.captureBookings) {
    return NextResponse.json({ ok: false, message: "Booking capture is disabled." }, { status: 404 });
  }

  try {
    const parsed = appointmentSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "We could not verify this booking." }, { status: 400 });
    }
    const result = await recordBooking(parsed.data, await repository());
    return NextResponse.json(result, {
      status: result.ok ? 201 : result.code === "invalid_inquiry" ? 409 : 503,
    });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ ok: false, message: "Please send a valid request." }, { status: error.status });
    }
    return NextResponse.json({ ok: false, message: "We could not record this appointment." }, { status: 503 });
  }
}
