import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { resolveTrustBar } from "@/lib/social-proof/inquiry-proof";
import { TrustBar } from "./TrustBar";

const stats = [
  { value: "1 Lakh+", label: "Customers Served" },
  { value: "12", label: "Stores" },
];

describe("TrustBar", () => {
  it("shows the live enquiry count beside the static stats in one bar", () => {
    render(
      <TrustBar
        content={resolveTrustBar({ count: 327, live: false, label: "327 enquiries received for this selection" }, stats, false)}
      />,
    );
    const bar = screen.getByRole("complementary", { name: "MK Jewels in numbers" });
    expect(bar).toHaveTextContent("327 enquiries received for this selection");
    expect(bar).toHaveTextContent("1 Lakh+ Customers Served");
    expect(bar).toHaveTextContent("12 Stores");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
    expect(screen.queryByText(/Development placeholder/)).not.toBeInTheDocument();
  });

  it("shows LIVE only when the server marks the count as a live measurement", () => {
    render(<TrustBar content={resolveTrustBar({ count: 42, live: true, label: "42 customers enquiring" }, [], false)} />);
    expect(screen.getByText("Live")).toBeVisible();
    expect(screen.getByText(/customers enquiring/)).toBeVisible();
  });

  it("labels placeholder stats", () => {
    render(<TrustBar content={resolveTrustBar(null, stats, true)} />);
    expect(screen.getByText(/Development placeholder · not approved for production · trust stats/)).toBeVisible();
  });

  it("renders nothing when there is neither a count nor a stat", () => {
    expect(resolveTrustBar(null, [], true)).toBeNull();
    const { container } = render(<TrustBar content={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("caps the number of stats and never labels a count-only bar as a placeholder", () => {
    const many = [...stats, { value: "10K+", label: "Designs" }, { value: "25", label: "Years" }, { value: "1", label: "Extra" }];
    expect(resolveTrustBar(null, many, false)?.stats).toHaveLength(4);
    expect(resolveTrustBar({ count: 3, live: false, label: "3 enquiries" }, [], true)?.placeholder).toBe(false);
  });
});
