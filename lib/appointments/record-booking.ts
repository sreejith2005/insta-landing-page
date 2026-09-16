import type { FunnelRepository } from "@/lib/leads/contracts";
import type { AppointmentInput } from "@/lib/validation/schemas";

export type RecordBookingResult =
  | { ok: true; appointmentId: string; inquiryId: string }
  | { ok: false; code: "invalid_inquiry" | "service_unavailable"; message: string };

/**
 * Associates a confirmed Calendly booking with the originating inquiry so the
 * full Instagram-to-appointment chain stays attributable.
 */
export async function recordBooking(
  input: AppointmentInput,
  repository: FunnelRepository,
): Promise<RecordBookingResult> {
  try {
    const result = await repository.recordAppointment(input);
    if (!result) {
      return {
        ok: false,
        code: "invalid_inquiry",
        message: "We could not verify this enquiry.",
      };
    }
    return { ok: true, ...result };
  } catch {
    return {
      ok: false,
      code: "service_unavailable",
      message: "We could not record this appointment.",
    };
  }
}
