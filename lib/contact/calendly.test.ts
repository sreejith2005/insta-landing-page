import { describe, expect, it } from "vitest";

import { calendlyUrl } from "./calendly";

describe("calendlyUrl", () => {
  it("keeps only https calendly.com scheduling links", () => {
    expect(calendlyUrl("https://calendly.com/mk-jewels/video-call")).toBe("https://calendly.com/mk-jewels/video-call");
    expect(calendlyUrl(undefined)).toBeUndefined();
    expect(calendlyUrl("")).toBeUndefined();
    expect(calendlyUrl("http://calendly.com/mk")).toBeUndefined();
    expect(calendlyUrl("https://calendly.com.evil.example/mk")).toBeUndefined();
    expect(calendlyUrl("https://evil.example/?https://calendly.com/mk")).toBeUndefined();
    expect(calendlyUrl('https://calendly.com/mk" onload="x')).toBeUndefined();
  });
});
