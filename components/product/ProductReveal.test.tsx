import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductReveal } from "./ProductReveal";
import type { IncomingInstagramContext, PublicProductContext } from "@/types/funnel";

const product: PublicProductContext = {
  productId: "MKBR639",
  productName: "Gold Open-Back Diamond Accented Bracelet",
  category: "Bracelet",
  collection: "Rakhi 2026",
  productImage: null,
  specifications: [{ label: "Purity", value: "18K" }],
  campaign: { campaignId: "RAKHI26", offerCopy: "Verified privilege" },
  calendly: {},
  whatsapp: {},
  ctas: {
    whatsappEnabled: true,
    callbackEnabled: true,
    order: ["store_visit", "video_consultation", "whatsapp", "callback"],
  },
};

const context: IncomingInstagramContext = {
  productId: "MKBR639",
  reelId: "R123",
  campaignId: "RAKHI26",
  source: "instagram",
};

const runtime = { landingPageVersion: "phase1", captureBookings: false };

function renderReveal(overrides: Partial<PublicProductContext> = {}) {
  return render(
    <ProductReveal
      product={{ ...product, ...overrides }}
      inquiryId="inq_1"
      customerId="cus_1"
      sessionId="d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4"
      context={context}
      runtime={runtime}
    />,
  );
}

describe("ProductReveal", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows a missing-image state and never renders price", () => {
    renderReveal();
    expect(screen.getByText("Approved product image unavailable")).toBeVisible();
    expect(screen.getByText("18K")).toBeVisible();
    expect(screen.queryByText(/₹|price/i)).not.toBeInTheDocument();
  });

  it("offers both appointment types and falls back when no Calendly link is configured", async () => {
    renderReveal();
    expect(screen.getByRole("button", { name: /Store Visit/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Video Consultation/ })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /Store Visit/ }));
    expect(screen.getByText(/Online scheduling is currently unavailable/)).toBeVisible();
  });

  it("builds a WhatsApp link from configuration without exposing lead PII", () => {
    renderReveal({ whatsapp: { number: "919876543210", messageTemplate: "Ref {productId} {inquiryId}" } });
    const link = screen.getByRole("link", { name: "Continue on WhatsApp" });
    expect(link).toHaveAttribute("href", "https://wa.me/919876543210?text=Ref%20MKBR639%20inq_1");
  });

  it("disables WhatsApp when no destination is configured", () => {
    renderReveal();
    expect(screen.queryByRole("link", { name: "Continue on WhatsApp" })).not.toBeInTheDocument();
    expect(screen.getByText("Continue on WhatsApp")).toHaveAttribute("aria-disabled", "true");
  });

  it("acknowledges a returning customer", () => {
    render(
      <ProductReveal
        product={product}
        inquiryId="inq_2"
        customerId="cus_1"
        isRepeatCustomer
        sessionId="d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4"
        context={context}
        runtime={runtime}
      />,
    );
    expect(screen.getByText(/Welcome back/)).toBeVisible();
  });
});
