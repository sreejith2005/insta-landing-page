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
});
