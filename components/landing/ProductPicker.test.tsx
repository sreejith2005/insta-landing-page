import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductPicker } from "./ProductPicker";

vi.mock("next/link", () => ({
  default: ({ href, prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => {
    void prefetch;
    return <a href={href} {...props} onClick={(event) => { props.onClick?.(event); event.preventDefault(); }} />;
  },
}));

const context = {
  reelId: "R456",
  campaignId: "BRIDAL26",
  source: "instagram" as const,
  utmSource: "instagram",
  landingPageVersion: "phase1",
};

const options = [
  {
    productId: "RG5073",
    productName: "Selected Gold Ring",
    href: "/instagram?reel=R456&campaign=BRIDAL26&product=RG5073",
  },
  {
    productId: "RG5074",
    productName: "Selected Diamond Solitaire Ring",
    href: "/instagram?reel=R456&campaign=BRIDAL26&product=RG5074",
  },
];

function events(fetchSpy: ReturnType<typeof vi.fn>) {
  return fetchSpy.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));
}

describe("ProductPicker", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
  });

  it("asks which piece, with each product name linking to each product", () => {
    render(<ProductPicker options={options} context={context} />);
    expect(screen.getByRole("heading", { name: "Which piece were you asking about?" })).toBeVisible();
    const gold = screen.getByRole("link", { name: "Selected Gold Ring" });
    expect(gold).toHaveAttribute("href", options[0].href);
    const solitaire = screen.getByRole("link", { name: "Selected Diamond Solitaire Ring" });
    expect(solitaire).toHaveAttribute("href", options[1].href);
  });

  it("records product_picker_shown once, with the Reel and campaign but no product", () => {
    const { rerender } = render(<ProductPicker options={options} context={context} />);
    rerender(<ProductPicker options={options} context={{ ...context }} />);
    const shown = events(fetchSpy).filter((event) => event.eventName === "product_picker_shown");
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ reelId: "R456", campaignId: "BRIDAL26", source: "instagram", utmSource: "instagram" });
    expect(shown[0]).not.toHaveProperty("productId");
  });

  it("records product_picker_selected with the chosen product on tap", async () => {
    render(<ProductPicker options={options} context={context} />);
    await userEvent.click(screen.getByRole("link", { name: /Selected Diamond Solitaire Ring/ }));
    const selected = events(fetchSpy).filter((event) => event.eventName === "product_picker_selected");
    expect(selected).toEqual([
      expect.objectContaining({ productId: "RG5074", reelId: "R456", campaignId: "BRIDAL26" }),
    ]);
    const [shown] = events(fetchSpy);
    expect(selected[0].sessionId).toBe(shown.sessionId);
  });
});
