import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { brandVideoConfig } from "@/config/experience";
import { resolveBrandVideo } from "./brand-video";

const suppliedFilm = existsSync(join(process.cwd(), "public", brandVideoConfig.src));

describe("resolveBrandVideo", () => {
  it.runIf(suppliedFilm)("plays a local /brand/*.mp4 configured by path", () => {
    expect(resolveBrandVideo("/brand/mk-jewels-intro.mp4", "production")).toMatchObject({
      kind: "file",
      src: "/brand/mk-jewels-intro.mp4",
      aspectRatio: "16 / 9",
    });
  });

  it.runIf(suppliedFilm)("uses the supplied film automatically in development", () => {
    expect(resolveBrandVideo(undefined, "development")?.src).toBe(brandVideoConfig.src);
  });

  it("requires explicit configuration in production and hides cleanly without it", () => {
    expect(resolveBrandVideo(undefined, "production")).toBeNull();
  });

  it("hides a configured local path whose file is missing", () => {
    expect(resolveBrandVideo("/brand/does-not-exist.mp4", "development")).toBeNull();
  });

  it("recognises hosted YouTube, Vimeo and MP4 URLs", () => {
    expect(resolveBrandVideo("https://youtu.be/abcdefghijk", "production")).toMatchObject({ kind: "youtube", src: "abcdefghijk" });
    expect(resolveBrandVideo("https://vimeo.com/123456789", "production")).toMatchObject({ kind: "vimeo", src: "123456789" });
    expect(resolveBrandVideo("https://cdn.example.com/film.mp4", "production")).toMatchObject({ kind: "file" });
  });
});
