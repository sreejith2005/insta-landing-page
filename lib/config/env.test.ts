import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env";

const base = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_LANDING_PAGE_VERSION: "phase1",
};

describe("parseServerEnv", () => {
  it("allows the preview provider outside production", () => {
    expect(
      parseServerEnv({ ...base, NODE_ENV: "test", DATA_PROVIDER: "preview" }),
    ).toMatchObject({ dataProvider: "preview" });
  });

  it("rejects the preview provider in production", () => {
    expect(() =>
      parseServerEnv({ ...base, NODE_ENV: "production", DATA_PROVIDER: "preview" }),
    ).toThrow(/preview provider/i);
  });

  it("requires Google credentials for the production provider", () => {
    expect(() =>
      parseServerEnv({
        ...base,
        NODE_ENV: "production",
        DATA_PROVIDER: "google-sheets",
      }),
    ).toThrow(/Google Sheets configuration/i);
  });

  it("defaults to the Products and Reel_Product_Map tabs, and an empty map name disables the map", () => {
    const parsed = parseServerEnv({ ...base, NODE_ENV: "test" });
    expect(parsed.google.sheets.products).toBe("Products");
    expect(parsed.google.sheets.reelMap).toBe("Reel_Product_Map");
    expect(parseServerEnv({ ...base, NODE_ENV: "test", GOOGLE_REEL_MAP_SHEET: "" }).google.sheets.reelMap).toBeUndefined();
  });

  it("uses one flat Product_Master tab and accepts blank optional public URLs", () => {
    // A platform env-var UI (or a blank .env line) commonly stores "" rather
    // than omitting the key entirely; this must not crash env parsing.
    const parsed = parseServerEnv({
      ...base,
      NODE_ENV: "test",
      DATA_PROVIDER: "preview",
      GOOGLE_PRODUCT_SHEET: "Product_Master",
      NEXT_PUBLIC_BRAND_VIDEO_URL: "",
      ASSISTED_SUPPORT_URL: "",
    });
    expect(parsed.google.sheets.products).toBe("Product_Master");
    expect(parsed.public.brandVideoUrl).toBeUndefined();
    expect(parsed.assistedSupportUrl).toBeUndefined();
  });

  it("rejects a non-https brand video URL", () => {
    expect(() =>
      parseServerEnv({
        ...base,
        NODE_ENV: "test",
        DATA_PROVIDER: "preview",
        NEXT_PUBLIC_BRAND_VIDEO_URL: "http://insecure.example",
      }),
    ).toThrow(/https/i);
  });

  it("accepts a self-hosted /public brand video path", () => {
    const parsed = parseServerEnv({
      ...base,
      NODE_ENV: "test",
      DATA_PROVIDER: "preview",
      NEXT_PUBLIC_BRAND_VIDEO_URL: "/brand/mk-jewels-brand-film.mp4",
    });
    expect(parsed.public.brandVideoUrl).toBe("/brand/mk-jewels-brand-film.mp4");
    expect(() =>
      parseServerEnv({ ...base, NODE_ENV: "test", NEXT_PUBLIC_BRAND_VIDEO_URL: "//evil.example/a.mp4" }),
    ).toThrow();
  });

  it("never enables development social proof in production, even when requested", () => {
    const parsed = parseServerEnv({
      ...base,
      NODE_ENV: "production",
      DATA_PROVIDER: "google-sheets",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@example.iam.gserviceaccount.com",
      GOOGLE_PRIVATE_KEY: "key",
      GOOGLE_SPREADSHEET_ID: "sheet",
      SHOW_DEVELOPMENT_SOCIAL_PROOF: "true",
    });
    expect(parsed.showDevelopmentSocialProof).toBe(false);
  });

  it("enables development social proof by default only in development", () => {
    expect(parseServerEnv({ ...base, NODE_ENV: "development" }).showDevelopmentSocialProof).toBe(true);
    expect(
      parseServerEnv({ ...base, NODE_ENV: "development", SHOW_DEVELOPMENT_SOCIAL_PROOF: "false" })
        .showDevelopmentSocialProof,
    ).toBe(false);
    expect(parseServerEnv({ ...base, NODE_ENV: "test" }).showDevelopmentSocialProof).toBe(false);
  });

  it("parses inquiry count settings and allows LIVE only in recent mode", () => {
    const total = parseServerEnv({ ...base, NODE_ENV: "test", INQUIRY_COUNT_SHOW_LIVE: "true" });
    expect(total.inquiryCount).toMatchObject({ enabled: true, mode: "total", allowLiveLabel: false, minimumCount: 1 });
    const recent = parseServerEnv({
      ...base,
      NODE_ENV: "test",
      SHOW_INQUIRY_COUNT: "true",
      INQUIRY_COUNT_MODE: "recent",
      INQUIRY_COUNT_RECENT_HOURS: "48",
      INQUIRY_COUNT_SHOW_LIVE: "true",
    });
    expect(recent.inquiryCount).toMatchObject({ mode: "recent", recentWindowHours: 48, allowLiveLabel: true });
    expect(parseServerEnv({ ...base, NODE_ENV: "test", SHOW_INQUIRY_COUNT: "false" }).inquiryCount.enabled).toBe(false);
  });
});
