import { existsSync } from "node:fs";
import { join } from "node:path";

import { brandVideoConfig } from "@/config/experience";

export type BrandVideoSource = {
  kind: "file" | "youtube" | "vimeo";
  /** File URL, or the provider's video id. */
  src: string;
  poster?: string;
  title: string;
  aspectRatio: string;
};

const publicFileCache = new Map<string, boolean>();

/** Checks a root-relative path against /public once per server process. */
function publicFileExists(path: string) {
  if (!path.startsWith("/") || path.includes("..")) return false;
  let exists = publicFileCache.get(path);
  if (exists === undefined) {
    exists = existsSync(join(process.cwd(), "public", path));
    publicFileCache.set(path, exists);
  }
  return exists;
}

function providerSource(url: URL): Pick<BrandVideoSource, "kind" | "src"> {
  if (url.hostname === "youtu.be") return { kind: "youtube", src: url.pathname.slice(1) };
  if (url.hostname.endsWith("youtube.com")) {
    const id = url.searchParams.get("v");
    if (id) return { kind: "youtube", src: id };
  }
  if (url.hostname.endsWith("vimeo.com")) {
    const id = url.pathname.split("/").filter(Boolean).at(-1);
    if (id && /^\d+$/.test(id)) return { kind: "vimeo", src: id };
  }
  return { kind: "file", src: url.toString() };
}

/**
 * Resolves the brand film. An explicit NEXT_PUBLIC_BRAND_VIDEO_URL (https URL
 * or /public path) always wins. Without one, development automatically uses
 * `brandVideoConfig.src` when that file exists; production requires the env
 * var so a stray local file is never published by accident.
 */
export function resolveBrandVideo(
  envUrl: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): BrandVideoSource | null {
  const poster = publicFileExists(brandVideoConfig.poster) ? brandVideoConfig.poster : undefined;
  const base = { poster, title: brandVideoConfig.title, aspectRatio: brandVideoConfig.aspectRatio };

  if (envUrl) {
    if (envUrl.startsWith("/")) {
      return publicFileExists(envUrl) ? { ...base, kind: "file", src: envUrl } : null;
    }
    try {
      const source = providerSource(new URL(envUrl));
      if (source.kind !== "file" && !/^[A-Za-z0-9_-]{6,20}$/.test(source.src)) return null;
      return { ...base, ...source };
    } catch {
      return null;
    }
  }

  if (nodeEnv === "production") return null;
  return publicFileExists(brandVideoConfig.src) ? { ...base, kind: "file", src: brandVideoConfig.src } : null;
}
