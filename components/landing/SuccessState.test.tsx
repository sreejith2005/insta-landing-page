import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
    expect(screen.getByText(/representative will contact you shortly/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Your personal assistance has begun" })).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("Welcome back.")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/MK001|MKBR639|product|specification|price|₹/i);
  });

  it("welcomes a repeat customer", () => {
    render(<SuccessState isRepeatCustomer firstName="Ananya" />);
    expect(screen.getByText("Welcome back.")).toBeVisible();
  });
});
