import type { FunnelRepository } from "@/lib/leads/contracts";
import type { EventInput } from "@/lib/validation/schemas";

const allowedMetadata = new Set(["appointmentType", "reason", "embedStatus"]);

export async function recordEvent(input: EventInput, repository: FunnelRepository) {
  const metadata = Object.fromEntries(
    Object.entries(input.metadata ?? {}).filter(([key]) => allowedMetadata.has(key)),
  );
  await repository.recordEvent({ ...input, metadata });
  return { ok: true as const };
}
