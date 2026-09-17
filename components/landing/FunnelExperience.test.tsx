import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEVELOPMENT_PLACEHOLDER_SOCIAL_PROOF } from "@/config/social-proof.development";
import type { SocialProofContent } from "@/config/social-proof";
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
    reviews: [{ name: "Approved Reviewer", rating: 5, text: "Approved review text." }],
  },
  testimonials: [
    { type: "text", name: "Approved Customer", context: "Mumbai", quote: "Approved story quote." },
    { type: "image", name: "Approved Bride", quote: "Approved image story.", asset: "/testimonials/bride.jpg" },
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

describe("FunnelExperience", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders the hero, offer and real enquiry proof without exposing attribution", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{
          landingPageVersion: "rich-v3",
          inquiryProof: { count: 327, live: false, label: "327 enquiries received for this selection" },
        }}
      />,
    );

    const hero = screen.getByRole("region", { name: /You found the piece/ });
    expect(within(hero).getByText("327")).toBeVisible();
    expect(within(hero).getByText(/enquiries received for this selection/)).toBeVisible();
    expect(within(hero).getByText("Up to 30% off on making charges")).toBeVisible();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock My 30% Benefit" })).toBeEnabled();
    expect(document.body.innerHTML).not.toMatch(/MKBR639|R123|RAKHI26/);
  });

  it("shows LIVE only when the server marks the proof as a live measurement", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{
          landingPageVersion: "rich-v3",
          inquiryProof: { count: 42, live: true, label: "42 customers enquiring" },
        }}
      />,
    );
    expect(screen.getByText("Live")).toBeVisible();
    expect(screen.getByText(/customers enquiring/)).toBeVisible();
  });

  it("renders a large brand-film section right after the hero, loading the file only on play", () => {
    render(<FunnelExperience context={context} runtime={{ landingPageVersion: "rich-v3", brandVideo: film }} />);

    const section = screen.getByRole("region", { name: /Crafted with care/ });
    expect(section.previousElementSibling).toHaveAttribute("id", "hero");
    expect(section.querySelector("video")).toBeNull();
    fireEvent.click(within(section).getByRole("button", { name: /Play video/ }));
    expect(section.querySelector("video source")).toHaveAttribute("src", "/brand/mk-jewels-intro.mp4");
  });

  it("hides the film section cleanly when no film is configured", () => {
    render(<FunnelExperience context={context} runtime={{ landingPageVersion: "rich-v3" }} />);
    expect(screen.queryByRole("region", { name: /Crafted with care/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Play video/ })).not.toBeInTheDocument();
  });

  it("renders exactly one lead form and points every call to action at it", () => {
    render(
      <FunnelExperience
        context={context}
        runtime={{
          landingPageVersion: "rich-v3",
          brandVideo: film,
          socialProof: resolveSocialProof(approved, empty, false, "production"),
        }}
      />,
    );

    expect(document.querySelectorAll("form")).toHaveLength(1);
    const ctas = document.querySelectorAll<HTMLAnchorElement>("a[data-cta]");
    expect([...ctas].map((cta) => cta.dataset.cta)).toEqual(
      expect.arrayContaining(["hero", "video", "mid", "proof", "final", "sticky"]),
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

    expect(screen.getByLabelText("Since 1999")).toBeVisible();
    expect(screen.getByRole("heading", { name: /Trusted by jewellery buyers/ })).toBeVisible();
    expect(screen.getByText("4.8")).toBeVisible();
    expect(screen.getByText("1,234 reviews on Google")).toBeVisible();
    expect(screen.getByText("Approved review text.")).toBeVisible();
    expect(screen.getByText("Approved story quote.")).toBeVisible();
    expect(screen.getByAltText("Approved Bride")).toBeInTheDocument();
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
    expect(screen.queryByRole("heading", { name: /meaningful moments/ })).not.toBeInTheDocument();
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

    expect(screen.getAllByText(/Development placeholder · not approved for production/)).toHaveLength(3);
    expect(screen.getByLabelText("1 Lakh+")).toBeVisible();
    expect(screen.getByRole("heading", { name: /Trusted by jewellery buyers/ })).toBeVisible();
    expect(screen.getByRole("heading", { name: /meaningful moments/ })).toBeVisible();
  });
});
