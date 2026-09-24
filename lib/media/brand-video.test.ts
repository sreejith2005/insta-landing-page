import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { brandVideoConfig, secondVideoConfig } from "@/config/experience";
import { resolveBrandVideo } from "./brand-video";

describe("resolveBrandVideo", () => {
  it("ships the configured brand film and poster in /public", () => {
    expect(existsSync(join(process.cwd(), "public", brandVideoConfig.src))).toBe(true);
    expect(existsSync(join(process.cwd(), "public", brandVideoConfig.poster))).toBe(true);
  });

  it("uses the configured film without any env var", () => {
    expect(resolveBrandVideo(undefined)).toMatchObject({
      kind: "file",
      src: brandVideoConfig.src,
      poster: brandVideoConfig.poster,
      aspectRatio: "16 / 9",
    });
  });

  it("lets an env URL override the configured film", () => {
    expect(resolveBrandVideo("/brand/other.mp4")?.src).toBe("/brand/other.mp4");
  });

  it("hides a slot with no film configured", () => {
    expect(resolveBrandVideo(undefined, { ...secondVideoConfig, src: "" })).toBeNull();
    expect(resolveBrandVideo("/../secret.mp4")).toBeNull();
  });

  it("recognises hosted YouTube, Vimeo and MP4 URLs", () => {
    expect(resolveBrandVideo("https://youtu.be/abcdefghijk")).toMatchObject({ kind: "youtube", src: "abcdefghijk" });
    expect(resolveBrandVideo("https://vimeo.com/123456789")).toMatchObject({ kind: "vimeo", src: "123456789" });
    expect(resolveBrandVideo("https://cdn.example.com/film.mp4")).toMatchObject({ kind: "file" });
  });

  it("resolves another film slot from its own config", () => {
    expect(resolveBrandVideo("https://vimeo.com/123456789", secondVideoConfig)).toMatchObject({
      kind: "vimeo",
      title: secondVideoConfig.title,
    });
  });
});
