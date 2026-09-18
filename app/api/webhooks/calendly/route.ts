import { NextResponse } from "next/server";

import { verifyCalendlySignature } from "@/lib/bookings/calendly-signature";
import { recordCalendlyBooking } from "@/lib/bookings/record-calendly-booking";
import { serverEnv } from "@/lib/config/env";
import { repository } from "@/lib/providers/repository";
import { calendlyInviteeCreatedSchema, calendlyWebhookSchema } from "@/lib/validation/schemas";

/** Calendly payloads carry booking answers, so allow more than the 16 KB lead limit. */
const MAX_BODY_BYTES = 65_536;

/**
 * Calendly webhook: the only source of the real booked date and time. Every
 * request must carry a valid signature. `invitee.created` is appended to the
 * Bookings tab; other signed events are acknowledged and ignored. A failed
 * write returns 503 so Calendly retries, and retries are deduplicated by
 * invitee URI.
 */
export async function POST(request: Request) {
  const env = serverEnv();
  const signingKey = env.calendly.webhookSigningKey;
  if (!signingKey) return NextResponse.json({ ok: false }, { status: 503 });

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }
  if (!verifyCalendlySignature(request.headers.get("calendly-webhook-signature"), rawBody, signingKey)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const envelope = calendlyWebhookSchema.safeParse(body);
  if (!envelope.success) return NextResponse.json({ ok: false }, { status: 400 });
  if (envelope.data.event !== "invitee.created") return NextResponse.json({ ok: true, ignored: true });

  const parsed = calendlyInviteeCreatedSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const result = await recordCalendlyBooking(parsed.data, await repository(), env.calendly.eventTypes);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    // Message only: a Sheets error can echo the row, which holds invitee PII.
    console.error("Calendly booking write failed", { error: (error as Error).message });
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
