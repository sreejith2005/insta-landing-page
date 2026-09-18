import type { FunnelRepository } from "@/lib/leads/contracts";
import type { EventInput } from "@/lib/validation/schemas";

/**
 * Only these metadata keys may reach analytics storage. Anything else — above
 * all lead PII — is dropped before the write.
 */
const allowedMetadata = new Set([
  "reason",
  "productPosition",
  /** "video_call" | "store_visit", on Calendly events. */
  "bookingType",
]);

export async function recordEvent(input: EventInput, repository: FunnelRepository) {
  const metadata = Object.fromEntries(
    Object.entries(input.metadata ?? {}).filter(([key]) => allowedMetadata.has(key)),
  );
  await repository.recordEvent({ ...input, metadata });
  return { ok: true as const };
}
