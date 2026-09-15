import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductReveal } from "./ProductReveal";
import type { PublicProductContext } from "@/types/funnel";

const product: PublicProductContext = {
  productId: "MKBR639",
  productName: "Gold Open-Back Diamond Accented Bracelet",
  productImage: null,
  specifications: [{ label: "Purity", value: "18K" }],
  campaign: { campaignId: "RAKHI26", offerCopy: "Verified privilege" },
  calendly: {},
  ctas: { whatsappEnabled: true, callbackEnabled: true, order: ["store_visit", "video_consultation", "whatsapp", "callback"] },
};

describe("ProductReveal", () => {
  it("shows a missing-image state and never renders price", () => {
    render(<ProductReveal product={product} inquiryId="inq_1" sessionId="session_1" />);
    expect(screen.getByText("Approved product image unavailable")).toBeVisible();
    expect(screen.getByText("18K")).toBeVisible();
    expect(screen.queryByText(/₹|price/i)).not.toBeInTheDocument();
  });
});
