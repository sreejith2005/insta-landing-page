import type { FunnelRepository } from "@/lib/leads/contracts";
import type { CallbackInput } from "@/lib/validation/schemas";

export async function requestCallback(input: CallbackInput, repository: FunnelRepository) {
  try {
    const result = await repository.requestCallback(input);
    if (!result) {
      return {
        ok: false as const,
        code: "invalid_inquiry" as const,
        message: "We could not verify this enquiry.",
      };
    }
    return { ok: true as const, ...result };
  } catch {
    return {
      ok: false as const,
      code: "service_unavailable" as const,
      message: "We could not request a callback. Please try again.",
    };
  }
}
