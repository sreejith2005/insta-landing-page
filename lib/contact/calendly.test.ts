import { describe, expect, it } from "vitest";

import { calendlyUrl, schedulerUrl } from "./calendly";

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

describe("schedulerUrl", () => {
  it("sets the inquiry ID as utm_content and the booking choice as utm_term", () => {
    const url = new URL(schedulerUrl("https://calendly.com/mk/video", { inquiryId: "inq_1", bookingType: "store_visit" }));
    expect(url.origin + url.pathname).toBe("https://calendly.com/mk/video");
    expect(url.searchParams.get("utm_content")).toBe("inq_1");
    expect(url.searchParams.get("utm_term")).toBe("store_visit");
  });

  it("hides Calendly's own header and cookie banner", () => {
    const url = new URL(schedulerUrl("https://calendly.com/mk/video"));
    expect(url.searchParams.get("hide_event_type_details")).toBe("1");
    expect(url.searchParams.get("hide_landing_page_details")).toBe("1");
    expect(url.searchParams.get("hide_gdpr_banner")).toBe("1");
    expect(url.searchParams.has("utm_content")).toBe(false);
    expect(url.searchParams.has("utm_term")).toBe(false);
  });

  it("keeps the link's other parameters and replaces existing tracking values", () => {
    const url = new URL(
      schedulerUrl("https://calendly.com/mk/video?month=2026-10&utm_content=reel&utm_term=x", {
        inquiryId: "inq_2",
        bookingType: "video_call",
      }),
    );
    expect(url.searchParams.get("month")).toBe("2026-10");
    expect(url.searchParams.getAll("utm_content")).toEqual(["inq_2"]);
    expect(url.searchParams.getAll("utm_term")).toEqual(["video_call"]);
  });
});
