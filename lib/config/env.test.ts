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
});
