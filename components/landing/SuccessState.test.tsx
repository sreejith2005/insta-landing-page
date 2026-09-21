import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CALENDLY_WIDGET_SRC } from "@/lib/contact/calendly";
import { SuccessState } from "./SuccessState";

describe("SuccessState", () => {
  it("confirms the offer, next steps and representative follow-up without product content", () => {
    render(
      <SuccessState
        isRepeatCustomer={false}
        offerCopy="Your exclusive benefit is unlocked."
        contactCopy="An MK Jewels representative will contact you shortly regarding the jewellery you selected."
        firstName="Ananya Shah"
      />,
    );
    const heading = screen.getByRole("heading", { level: 1, name: "Your exclusive benefit is unlocked." });
    expect(heading).toBeVisible();
    expect(heading).toHaveFocus();
    expect(screen.getByText("Thank you, Ananya.")).toBeVisible();
    expect(screen.getByText("Your enquiry has been received.")).toBeVisible();
    expect(screen.getByText(/discount has been applied/i)).toBeVisible();
    expect(screen.getByText(/representative will contact you shortly/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Your personal assistance has begun" })).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("Welcome back.")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/MK001|MKBR639|product|specification|price|₹/i);
  });

  it("offers the booking choice first, mounting one scheduler only after the customer picks", () => {
    const { rerender } = render(
      <SuccessState
        isRepeatCustomer={false}
        booking={{ videoUrl: "https://calendly.com/mk/video", storeUrl: "https://calendly.com/mk/store" }}
      />,
    );
    const video = screen.getByRole("button", { name: "Book a video call demo" });
    expect(video).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Book a video call demo" })).not.toBeInTheDocument();

    fireEvent.click(video);
    expect(video).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Book a video call demo" })).toHaveAttribute("id", video.getAttribute("aria-controls"));
    // The official embed script, never a hand-built iframe.
    expect(document.querySelector(`script[src="${CALENDLY_WIDGET_SRC}"]`)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Book a store visit" }));
    expect(screen.queryByRole("region", { name: "Book a video call demo" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Book a store visit" })).toBeInTheDocument();

    rerender(<SuccessState isRepeatCustomer={false} booking={{ storeUrl: "https://calendly.com/mk/store" }} />);
    expect(screen.queryByRole("button", { name: "Book a video call demo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book a store visit" })).toBeVisible();

    rerender(<SuccessState isRepeatCustomer={false} booking={{}} />);
    expect(screen.queryByRole("button", { name: /Book a/ })).not.toBeInTheDocument();
  });

  it("presents all three choices in one row and keeps WhatsApp independent of the scheduler", () => {
    const track = vi.fn();
    render(
      <SuccessState
        isRepeatCustomer={false}
        booking={{ videoUrl: "https://calendly.com/mk/video", storeUrl: "https://calendly.com/mk/store" }}
        whatsappUrl="https://wa.me/919876543210?text=Hi"
        track={track}
      />,
    );
    const choices = document.querySelector(".success-choice")!;
    expect(
      [...choices.children].map((child) => child.textContent?.replace("↗", "").trim()),
    ).toEqual(["Book a video call demo", "Book a store visit", "Chat on WhatsApp"]);

    fireEvent.click(screen.getByRole("button", { name: "Book a store visit" }));
    const whatsapp = screen.getByRole("link", { name: /Chat on WhatsApp/ });
    whatsapp.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(whatsapp);

    // WhatsApp neither closes nor swaps the scheduler the customer already chose.
    expect(screen.getByRole("region", { name: "Book a store visit" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("whatsapp_contact_clicked");
    expect(track).toHaveBeenCalledTimes(2);
  });

  it("offers WhatsApp only with a configured link and never shows its pre-filled product text", () => {
    const whatsappUrl = `https://wa.me/919876543210?text=${encodeURIComponent("Hi, I'm interested in Rose Bracelet (MKBR639)")}`;
    const { rerender } = render(<SuccessState isRepeatCustomer={false} whatsappUrl={whatsappUrl} />);
    const link = screen.getByRole("link", { name: /Chat on WhatsApp/ });
    expect(link).toHaveAttribute("href", whatsappUrl);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(document.body.textContent).not.toMatch(/Rose Bracelet|MKBR639/);

    rerender(<SuccessState isRepeatCustomer={false} />);
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it("tracks each scheduler as it mounts and forwards only Calendly's own postMessage events", () => {
    const track = vi.fn();
    render(
      <SuccessState
        isRepeatCustomer={false}
        booking={{ videoUrl: "https://calendly.com/mk/video", storeUrl: "https://calendly.com/mk/store" }}
        track={track}
      />,
    );
    const calendly = (event: string, origin = "https://calendly.com") =>
      act(() => {
        window.dispatchEvent(new MessageEvent("message", { origin, data: { event, payload: {} } }));
      });

    // No scheduler open: nothing is listened to.
    calendly("calendly.event_scheduled");
    expect(track).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Book a video call demo" }));
    expect(track).toHaveBeenLastCalledWith("calendly_video_call_opened", { bookingType: "video_call" });

    calendly("calendly.date_and_time_selected");
    expect(track).toHaveBeenLastCalledWith("calendly_date_time_selected", { bookingType: "video_call" });
    calendly("calendly.event_scheduled", "https://evil.example");
    calendly("calendly.profile_page_viewed");
    expect(track).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Book a store visit" }));
    expect(track).toHaveBeenLastCalledWith("calendly_store_visit_opened", { bookingType: "store_visit" });
    calendly("calendly.event_scheduled");
    expect(track).toHaveBeenLastCalledWith("calendly_event_scheduled", { bookingType: "store_visit" });

    // Closing a scheduler does not count as opening it again.
    fireEvent.click(screen.getByRole("button", { name: "Book a store visit" }));
    expect(track).toHaveBeenCalledTimes(4);
  });

  it("tracks the WhatsApp click", () => {
    const track = vi.fn();
    render(<SuccessState isRepeatCustomer={false} whatsappUrl="https://wa.me/919876543210?text=Hi" track={track} />);
    const link = screen.getByRole("link", { name: /Chat on WhatsApp/ });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith("whatsapp_contact_clicked");
  });

  it("welcomes a repeat customer", () => {
    render(<SuccessState isRepeatCustomer firstName="Ananya" />);
    expect(screen.getByText("Welcome back.")).toBeVisible();
  });
});
