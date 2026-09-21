import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CalendlyInline } from "./CalendlyInline";
import { SuccessState } from "./SuccessState";

// jsdom never loads widget.js, so stand in for it: `onReady` fires on mount.
vi.mock("next/script", () => ({
  default: function Script({ onReady }: { onReady?: () => void }) {
    useEffect(() => onReady?.(), [onReady]);
    return null;
  },
}));

const initInlineWidget = vi.fn();

beforeEach(() => {
  window.Calendly = { initInlineWidget };
});
afterEach(() => {
  initInlineWidget.mockReset();
  delete window.Calendly;
});

const embedUrl = () => new URL(initInlineWidget.mock.lastCall![0].url);

describe("CalendlyInline", () => {
  it("passes the inquiry ID to Calendly as utm_content", () => {
    render(<CalendlyInline url="https://calendly.com/mk/video" id="booking" label="Book" inquiryId="inq_abc-123" />);
    expect(initInlineWidget).toHaveBeenCalledOnce();
    expect(embedUrl().origin + embedUrl().pathname).toBe("https://calendly.com/mk/video");
    expect(embedUrl().searchParams.get("utm_content")).toBe("inq_abc-123");
    expect(initInlineWidget.mock.lastCall![0]).toMatchObject({ resize: true });
  });

  it("embeds the plain link when there is no inquiry ID", () => {
    render(<CalendlyInline url="https://calendly.com/mk/video" id="booking" label="Book" />);
    expect(initInlineWidget.mock.lastCall![0].url).toBe("https://calendly.com/mk/video");
  });
});

describe("SuccessState → Calendly", () => {
  it("tags whichever scheduler the customer opens with the accepted inquiry", () => {
    render(
      <SuccessState
        isRepeatCustomer={false}
        booking={{ videoUrl: "https://calendly.com/mk/video", storeUrl: "https://calendly.com/mk/store" }}
        inquiryId="inq_42"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Book a store visit" }));
    expect(embedUrl().pathname).toBe("/mk/store");
    expect(embedUrl().searchParams.get("utm_content")).toBe("inq_42");

    fireEvent.click(screen.getByRole("button", { name: "Book a video call demo" }));
    expect(embedUrl().pathname).toBe("/mk/video");
    expect(embedUrl().searchParams.get("utm_content")).toBe("inq_42");
  });
});
