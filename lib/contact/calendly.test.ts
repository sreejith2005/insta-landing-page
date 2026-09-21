import { describe, expect, it } from "vitest";

import { calendlyUrl, withInquiryTracking } from "./calendly";

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

describe("withInquiryTracking", () => {
  it("sets the inquiry ID as utm_content", () => {
    expect(withInquiryTracking("https://calendly.com/mk/video", "inq_1")).toBe(
      "https://calendly.com/mk/video?utm_content=inq_1",
    );
  });

  it("keeps the link's other parameters and replaces an existing utm_content", () => {
    const tracked = new URL(
      withInquiryTracking("https://calendly.com/mk/video?hide_gdpr_banner=1&utm_content=reel", "inq_2"),
    );
    expect(tracked.searchParams.get("hide_gdpr_banner")).toBe("1");
    expect(tracked.searchParams.getAll("utm_content")).toEqual(["inq_2"]);
  });

  it("leaves the link alone without an inquiry ID", () => {
    expect(withInquiryTracking("https://calendly.com/mk/video", undefined)).toBe("https://calendly.com/mk/video");
  });
});
