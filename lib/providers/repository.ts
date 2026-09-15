import { PreviewRepository } from "./preview-repository";
import { serverEnv } from "@/lib/config/env";

const globalRepository = globalThis as typeof globalThis & { __mkjPreviewRepository?: PreviewRepository };

export async function repository() {
  const env = serverEnv();
  if (env.dataProvider === "google-sheets") {
    const { GoogleSheetsRepository } = await import("./google-sheets-repository");
    return new GoogleSheetsRepository(env.google);
  }
  globalRepository.__mkjPreviewRepository ??= new PreviewRepository();
  return globalRepository.__mkjPreviewRepository;
}
