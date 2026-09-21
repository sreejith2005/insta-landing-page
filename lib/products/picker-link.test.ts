import { describe, expect, it } from "vitest";

import { linkWithProduct } from "./picker-link";

describe("linkWithProduct", () => {
  it("adds the product and keeps attribution and DM parameters", () => {
    const href = linkWithProduct(
      { reel: "R456", campaign: "BRIDAL26", source: "manychat", utm_source: "instagram", u: "ananya.s", dm_ts: "2026-09-17T14:13:04Z" },
      "RG5074",
    );
    const url = new URL(href, "https://example.com");
    expect(url.pathname).toBe("/instagram");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      reel: "R456",
      campaign: "BRIDAL26",
      source: "manychat",
      utm_source: "instagram",
      u: "ananya.s",
      dm_ts: "2026-09-17T14:13:04Z",
      product: "RG5074",
    });
  });

  it("replaces any stray product value and drops repeated keys", () => {
    const url = new URL(linkWithProduct({ reel: "R456", campaign: "BRIDAL26", product: "", x: ["a", "b"] }, "RG1"), "https://e.com");
    expect(url.searchParams.getAll("product")).toEqual(["RG1"]);
    expect(url.searchParams.has("x")).toBe(false);
  });
});
