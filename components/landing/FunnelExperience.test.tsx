import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF } from "@/config/social-proof.development";
import { socialProof, type SocialProofContent } from "@/config/social-proof";
import { googleReviews } from "@/config/google-reviews";
import { testimonialVideos } from "@/config/testimonial-videos";
import { resolveSocialProof } from "@/lib/social-proof/resolve-social-proof";
import type { IncomingInstagramContext } from "@/types/funnel";
import { FunnelExperience } from "./FunnelExperience";

const context: IncomingInstagramContext = {
  productId: "MKBR639",
  reelId: "R123",
  campaignId: "RAKHI26",
  source: "manychat",
};

const approved: SocialProofContent = {
  trustMetrics: [
    { value: "Since 1999", label: "A legacy of trust" },
    { value: "5000+", label: "Designs" },
  ],
  googleReviews: {
    enabled: true,
    rating: "4.8",
    reviewCount: "1,234",
    profileUrl: "https://maps.google.com/?cid=1",
    reviews: [{ author: "Approved Reviewer", profileUrl: null, rating: 5, text: "Approved review text." }],
  },
  testimonials: [
    { type: "video", name: "Approved Customer", context: "Mumbai", quote: "Approved story quote.", asset: "/testimonials/one.mp4" },
    { type: "video", asset: "/testimonials/two.mp4" },
  ],
  mediaProof: [],
};

const empty: SocialProofContent = {
  trustMetrics: [],
  googleReviews: { enabled: false, reviews: [] },
  testimonials: [],
  mediaProof: [],
};

const film = { kind: "file" as const, src: "/brand/mk-jewels-intro.mp4", poster: "/brand/video-poster.jpg", title: "A look inside MK Jewels", aspectRatio: "16 / 9" };
const secondFilm = { kind: "file" as const, src: "/brand/mk-jewels-second-film.mp4", title: "MK Jewels high jewellery", aspectRatio: "16 / 9" };

describe("FunnelExperience", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
    // jsdom has no media playback.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the hero and offer without exposing attribution", () => {
    render(<FunnelExperience context={context} runtime={{ landingPageVersion: "rich-v3" }} />);

    const hero = screen.getByRole("region", { name: /You found the piece/ });
    expect(within(hero).getByText("Up to 30% off on making charges")).toBeVisible();
    expect(screen.getByRole("button", { name: "Unlock My 30% Benefit" })).toBeEnabled();
    expect(document.body.innerHTML).not.toMatch(/MKBR639|R123|RAKHI26/);
  });

  it("opens with the brand film, full-width and autoplaying muted, before the hero", () => {
    render(<FunnelExperience context={context} runtime={{ landingPageVersion: "rich-v3", brandVideo: film }} />);

    const section = screen.getByRole("region", { name: film.title });
    expect(document.querySelector("main")?.firstElementChild).toBe(section);
    expect(section.nextElementSibling).toHaveAttribute("id", "hero");
    const video = section.querySelector("video")!;
    expect(video).toHaveAttribute("autoplay");
    expect(video.muted).toBe(true);
    expect(section.querySelector("video source")).toHaveAttribute("src", "/brand/mk-jewels-intro.mp4");
    expect(within(section).queryByRole("button", { name: /Play video/ })).not.toBeInTheDocument();

    fireEvent.click(within(section).getByRole("button", { name: "Unmute" }));
    expect(video.muted).toBe(false);
    fireEvent.click(within(section).getByRole("button", { name: "Mute" }));
    expect(video.muted).toBe(true);
  });

  it("autoplays hosted films muted in the provider's player", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{ landingPageVersion: "rich-v3", brandVideo: { ...film, kind: "youtube", src: "abcdefghijk" } }}
      />,
    );
    const frame = screen.getByTitle(film.title);
    expect(frame.getAttribute("src")).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/abcdefghijk\?.*autoplay=1&mute=1/);
  });

  it("hides the film cleanly when no film is configured", () => {
    render(<FunnelExperience context={context} runtime={{ landingPageVersion: "rich-v3" }} />);
    expect(screen.queryByRole("region", { name: film.title })).not.toBeInTheDocument();
    expect(document.querySelector("video, iframe")).toBeNull();
  });

  it("renders exactly one lead form and points every call to action at it", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{
          landingPageVersion: "rich-v3",
          brandVideo: film,
          secondVideo: secondFilm,
          socialProof: resolveSocialProof(approved, empty, false, "production"),
        }}
      />,
    );

    expect(document.querySelectorAll("form")).toHaveLength(1);
    const ctas = document.querySelectorAll<HTMLAnchorElement>("a[data-cta]");
    expect([...ctas].map((cta) => cta.dataset.cta)).toEqual(
      expect.arrayContaining(["hero", "video", "mid", "proof", "sticky"]),
    );
    for (const cta of ctas) expect(cta.getAttribute("href")).toBe("#enquire");

    const form = document.getElementById("enquire")!;
    expect(form).toContainElement(document.querySelector("form"));
    form.scrollIntoView = vi.fn();
    fireEvent.click(document.querySelector("a[data-cta=proof]")!);
    expect(form.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByLabelText("Full Name")).toHaveFocus();
  });

  it("renders approved trust metrics, Google reviews and testimonials in production", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{ landingPageVersion: "rich-v3", socialProof: resolveSocialProof(approved, DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF, true, "production") }}
      />,
    );

    expect(screen.getByRole("heading", { name: /Trusted by jewellery buyers/ })).toBeVisible();
    expect(screen.getByText("4.8")).toBeVisible();
    expect(screen.getByText("1,234 reviews on Google")).toBeVisible();
    expect(screen.getByText("Approved review text.")).toBeVisible();
    expect(screen.getByText("Approved story quote.")).toBeVisible();
    // Both films are cards; the unattributed one carries no invented caption.
    expect(document.querySelectorAll(".story-card video")).toHaveLength(2);
    expect(screen.getByLabelText("Customer story 2")).toBeInTheDocument();
    expect(screen.queryByText(/Development placeholder/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Placeholder/);
  });

  it("never renders placeholder proof when resolved for production", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{ landingPageVersion: "rich-v3", socialProof: resolveSocialProof(empty, DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF, true, "production") }}
      />,
    );

    expect(screen.queryByRole("region", { name: /in numbers/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Trusted by jewellery buyers/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /own words/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Still thinking/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/placeholder|1 Lakh\+|XX\+/i);
  });

  it("labels every development placeholder section", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{ landingPageVersion: "rich-v3", socialProof: resolveSocialProof(empty, DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF, true, "development") }}
      />,
    );

    // Trust stats are labelled in the top trust bar, rendered by the page.
    // Only Google reviews have a stand-in here; customer films have none, so
    // the stories section stays absent rather than showing a fake film.
    expect(screen.getAllByText(/Development placeholder · not approved for production/)).toHaveLength(1);
    expect(screen.getByRole("heading", { name: /Trusted by jewellery buyers/ })).toBeVisible();
    expect(screen.queryByRole("heading", { name: /own words/ })).not.toBeInTheDocument();
  });

  it("after an accepted lead, shows booking and WhatsApp options and tags their events with the inquiry", async () => {
    const fetchSpy = vi.fn((url: string, init?: RequestInit) => {
      void init;
      return Promise.resolve(
        new Response(
          JSON.stringify({ ok: true, inquiryId: "inq_1", customerId: "cus_1", isRepeatCustomer: false }),
          { status: url === "/api/lead" ? 201 : 202, headers: { "Content-Type": "application/json" } },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("scrollTo", vi.fn());
    render(
      <FunnelExperience
        context={context}
        runtime={{
          landingPageVersion: "rich-v3",
          booking: { videoUrl: "https://calendly.com/mk/video" },
          whatsappUrl: "https://wa.me/919876543210?text=Hi%2C%20I%27m%20interested%20in%20Rose%20Bracelet%20(MKBR639)",
        }}
      />,
    );
    await userEvent.type(screen.getByLabelText("Full Name"), "Ananya Shah");
    await userEvent.type(screen.getByLabelText("Mobile Number"), "9876543210");
    await userEvent.type(screen.getByLabelText("PIN Code"), "400001");
    await userEvent.type(screen.getByLabelText("City"), "Mumbai");
    await userEvent.click(screen.getByRole("button", { name: "Unlock My 30% Benefit" }));

    fireEvent.click(await screen.findByRole("button", { name: "Book a video call demo" }));
    expect(screen.getByRole("link", { name: /Chat with a representative on WhatsApp/ })).toBeVisible();
    expect(document.body.textContent).not.toMatch(/Rose Bracelet|MKBR639/);

    await waitFor(() => {
      const opened = fetchSpy.mock.calls
        .filter(([url]) => url === "/api/events")
        .map(([, init]) => JSON.parse(String(init?.body)))
        .find((body) => body.eventName === "calendly_video_call_opened");
      expect(opened).toMatchObject({
        inquiryId: "inq_1",
        customerId: "cus_1",
        productId: "MKBR639",
        metadata: { bookingType: "video_call" },
      });
      expect(opened.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  it("places the second film, Google reviews and testimonials, in order, below the form", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{
          landingPageVersion: "rich-v3",
          secondVideo: secondFilm,
          socialProof: resolveSocialProof(approved, empty, false, "production"),
        }}
      />,
    );
    const form = document.getElementById("enquire")!;
    const video = screen.getByRole("region", { name: /Made to be noticed/ });
    const reviews = screen.getByRole("heading", { name: /Trusted by jewellery buyers/ }).closest("section")!;
    const stories = screen.getByRole("heading", { name: /own words/ }).closest("section")!;
    expect(form.nextElementSibling).toBe(video);
    expect(video.nextElementSibling).toBe(reviews);
    expect(reviews.nextElementSibling).toBe(stories);
    // Plays only when pressed, unlike the hero film.
    expect(video.querySelector("video")).toBeNull();
    expect(within(video).getByRole("button", { name: /Play video: MK Jewels high jewellery/ })).toBeVisible();
  });

  it("keeps the second film and proof below the success state, without a scroll-to-form CTA", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: true, inquiryId: "inq_1", customerId: "cus_1", isRepeatCustomer: false }), {
            status: url === "/api/lead" ? 201 : 202,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
    );
    vi.stubGlobal("scrollTo", vi.fn());
    render(
      <FunnelExperience
        context={context}
        runtime={{
          landingPageVersion: "rich-v3",
          secondVideo: secondFilm,
          socialProof: resolveSocialProof(approved, empty, false, "production"),
        }}
      />,
    );
    await userEvent.type(screen.getByLabelText("Full Name"), "Ananya Shah");
    await userEvent.type(screen.getByLabelText("Mobile Number"), "9876543210");
    await userEvent.type(screen.getByLabelText("PIN Code"), "400001");
    await userEvent.type(screen.getByLabelText("City"), "Mumbai");
    await userEvent.click(screen.getByRole("button", { name: "Unlock My 30% Benefit" }));

    const success = (await screen.findByRole("heading", { level: 1, name: /benefit is unlocked/ })).closest("main")!;
    const video = screen.getByRole("region", { name: /Made to be noticed/ });
    expect(success.nextElementSibling).toBe(video);
    expect(screen.getByRole("heading", { name: /Trusted by jewellery buyers/ })).toBeVisible();
    expect(screen.getByRole("heading", { name: /own words/ })).toBeVisible();
    expect(document.querySelector("a[data-cta]")).toBeNull();
  });

  it("renders the shipped approved proof — films, Google reviews and trust stats — in production, unlabelled", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{ landingPageVersion: "rich-v3", socialProof: resolveSocialProof(socialProof, DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF, true, "production") }}
      />,
    );
    expect(screen.getByRole("heading", { name: /own words/ })).toBeVisible();
    expect(document.querySelectorAll(".story-card")).toHaveLength(testimonialVideos.length);
    expect(screen.getByRole("heading", { name: /Trusted by jewellery buyers/ })).toBeVisible();
    expect(document.querySelectorAll(".review-card")).toHaveLength(googleReviews.reviews.length);
    // Real, approved content — never a labelled development placeholder.
    expect(screen.queryByText(/Development placeholder/i)).not.toBeInTheDocument();
    expect(document.querySelector("[data-placeholder]")).toBeNull();
  });

  it("no longer renders the 'Enquire with confidence' reassurance section", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{ landingPageVersion: "rich-v3", socialProof: resolveSocialProof(socialProof, DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF, true, "production") }}
      />,
    );
    expect(screen.queryByText(/Enquire with confidence/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Simple, private, and personal/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/No payment to enquire|Only four details|Private by design/)).not.toBeInTheDocument();
    expect(document.querySelector(".reassurance-band, a[data-cta=final]")).toBeNull();
  });
});
