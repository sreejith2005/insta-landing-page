import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Testimonial } from "@/config/social-proof";
import { Testimonials } from "./Testimonials";

const items: Testimonial[] = [
  { type: "video", asset: "/testimonials/one.mp4" },
  { type: "video", asset: "/testimonials/two.mp4", name: "Named Customer", context: "Bridal, Mumbai" },
];

// jsdom implements neither, so both are stubbed for every card.
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { value: false, configurable: true });
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { value: true, configurable: true });
  });
});

/** `play()` is started off a microtask, so a click is flushed before asserting. */
const press = (name: RegExp) =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });

describe("Testimonials", () => {
  it("renders nothing without approved films", () => {
    const { container } = render(<Testimonials items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows one card per film, and never invents a name for an unattributed one", () => {
    render(<Testimonials items={items} />);
    expect(document.querySelectorAll(".story-card")).toHaveLength(2);
    expect(screen.getByLabelText("Customer story 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Named Customer's story")).toBeInTheDocument();
    expect(screen.getByText("Named Customer")).toBeVisible();
    // The unattributed card carries no caption at all rather than a placeholder.
    expect(document.querySelectorAll(".story-caption")).toHaveLength(1);
  });

  it("starts each film silent and gives every card its own unmute", async () => {
    render(<Testimonials items={items} />);
    const unmute = screen.getAllByRole("button", { name: "Unmute" });
    expect(unmute).toHaveLength(2);

    const video = screen.getByLabelText("Customer story 1") as HTMLVideoElement;
    await press(/Play Customer story 1/);
    expect(video.muted).toBe(true);

    await act(async () => fireEvent.click(unmute[0]));
    expect(video.muted).toBe(false);
    expect(screen.getAllByRole("button", { name: "Mute" })).toHaveLength(1);
  });

  it("pauses the other films when one is played, so two never talk at once", async () => {
    render(<Testimonials items={items} />);
    const first = screen.getByLabelText("Customer story 1") as HTMLVideoElement;
    const second = screen.getByLabelText("Named Customer's story") as HTMLVideoElement;

    await press(/Play Customer story 1/);
    expect(first.paused).toBe(false);

    await press(/Play Named Customer's story/);
    expect(first.paused).toBe(true);
    expect(second.paused).toBe(false);
  });
});
