import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CalendlyInline } from "./CalendlyInline";
import { SuccessState } from "./SuccessState";

// jsdom never loads widget.js, so stand in for an already-loaded widget that
// draws an iframe as the real one does.
const initInlineWidget = vi.fn(({ parentElement }: { url: string; parentElement: HTMLElement }) => {
  parentElement.append(document.createElement("iframe"));
});

beforeEach(() => {
  window.Calendly = { initInlineWidget };
});
afterEach(() => {
  initInlineWidget.mockClear();
  delete window.Calendly;
  vi.useRealTimers();
});

const embedUrl = () => new URL(initInlineWidget.mock.lastCall![0].url);

describe("CalendlyInline", () => {
  it("passes the inquiry ID and booking choice to Calendly, with its own header hidden", () => {
    render(<CalendlyInline url="https://calendly.com/mk/video" inquiryId="inq_abc-123" bookingType="video_call" />);
    expect(initInlineWidget).toHaveBeenCalledOnce();
    expect(embedUrl().origin + embedUrl().pathname).toBe("https://calendly.com/mk/video");
    expect(embedUrl().searchParams.get("utm_content")).toBe("inq_abc-123");
    expect(embedUrl().searchParams.get("utm_term")).toBe("video_call");
    expect(embedUrl().searchParams.get("hide_event_type_details")).toBe("1");
    expect(initInlineWidget.mock.lastCall![0]).toMatchObject({ resize: true });
  });

  it("shows a loader until its own scheduler frame reports in", () => {
    const { container } = render(<CalendlyInline url="https://calendly.com/mk/video" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading available times");
    const frame = container.querySelector("iframe")!;

    // Another origin, or another Calendly frame, does not count.
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { origin: "https://evil.example", source: frame.contentWindow, data: { event: "calendly.page_height" } }));
      window.dispatchEvent(new MessageEvent("message", { origin: "https://calendly.com", source: window, data: { event: "calendly.page_height" } }));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new MessageEvent("message", { origin: "https://calendly.com", source: frame.contentWindow, data: { event: "calendly.event_type_viewed" } }));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("SuccessState → Calendly", () => {
  it("tags whichever scheduler the customer opens with the inquiry and booking choice", () => {
    render(
      <SuccessState
        isRepeatCustomer={false}
        booking={{ videoUrl: "https://calendly.com/mk/one", storeUrl: "https://calendly.com/mk/one" }}
        inquiryId="inq_42"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Store visit/ }));
    expect(embedUrl().searchParams.get("utm_content")).toBe("inq_42");
    expect(embedUrl().searchParams.get("utm_term")).toBe("store_visit");

    fireEvent.click(screen.getByRole("button", { name: /Video call demo/ }));
    expect(embedUrl().searchParams.get("utm_content")).toBe("inq_42");
    expect(embedUrl().searchParams.get("utm_term")).toBe("video_call");
  });

  it("pre-loads both schedulers, hidden, shortly after the confirmation appears", () => {
    vi.useFakeTimers();
    render(
      <SuccessState
        isRepeatCustomer={false}
        booking={{ videoUrl: "https://calendly.com/mk/video", storeUrl: "https://calendly.com/mk/store" }}
      />,
    );
    expect(initInlineWidget).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(initInlineWidget).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("region", { name: /Video call demo|Store visit/ })).not.toBeInTheDocument();

    // Opening one shows the already-loaded scheduler rather than starting another.
    fireEvent.click(screen.getByRole("button", { name: /Store visit/ }));
    expect(screen.getByRole("region", { name: "Store visit" })).toBeVisible();
    expect(initInlineWidget).toHaveBeenCalledTimes(2);
  });
});
