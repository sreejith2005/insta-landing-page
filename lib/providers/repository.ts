import { PreviewRepository } from "./preview-repository";
import type { FunnelRepository } from "@/lib/leads/contracts";
import { serverEnv } from "@/lib/config/env";

/**
 * Both providers are cached on `globalThis` so they survive module re-evaluation
 * in dev. Rebuilding the Sheets adapter per request would mint a fresh service
 * account JWT and discard the sheet header cache on every page view.
 */
const cache = globalThis as typeof globalThis & {
  __mkjPreviewRepository?: PreviewRepository;
  __mkjSheetsRepository?: FunnelRepository;
};

export async function repository(): Promise<FunnelRepository> {
  const env = serverEnv();
  if (env.dataProvider === "google-sheets") {
    if (!cache.__mkjSheetsRepository) {
      const { GoogleSheetsRepository } = await import("./google-sheets-repository");
      const { createReferenceNumberSource, redisReferenceCounter } = await import("@/lib/leads/reference-number");
      cache.__mkjSheetsRepository = new GoogleSheetsRepository(env.google, {
        referenceNumber: createReferenceNumberSource(redisReferenceCounter(env.rateLimit)),
      });
    }
    return cache.__mkjSheetsRepository;
  }
  cache.__mkjPreviewRepository ??= new PreviewRepository();
  return cache.__mkjPreviewRepository;
}
