import { brandVideoConfig } from "@/config/experience";

/** Where a film's local file, poster, title and shape come from. Empty `src`/`poster` = none. */
export type VideoConfig = { src: string; poster: string; title: string; aspectRatio: string };

export type BrandVideoSource = {
  kind: "file" | "youtube" | "vimeo";
  /** File URL, or the provider's video id. */
  src: string;
  poster?: string;
  title: string;
  aspectRatio: string;
};

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
 * Resolves a film (the brand film by default; pass `config` for another slot).
 * An env URL (https URL or /public path) wins; otherwise `config.src` is used,
 * and an empty `src` hides the section.
 *
 * No filesystem check here: on Vercel, /public is served from the CDN and is
 * not inside the server function, so the file would always look "missing".
 */
export function resolveBrandVideo(envUrl: string | undefined, config: VideoConfig = brandVideoConfig): BrandVideoSource | null {
  const base = { poster: config.poster || undefined, title: config.title, aspectRatio: config.aspectRatio };
  const url = envUrl || config.src;
  if (!url) return null;
  if (url.startsWith("/")) return url.includes("..") ? null : { ...base, kind: "file", src: url };

  try {
    const source = providerSource(new URL(url));
    if (source.kind !== "file" && !/^[A-Za-z0-9_-]{6,20}$/.test(source.src)) return null;
    return { ...base, ...source };
  } catch {
    return null;
  }
}
