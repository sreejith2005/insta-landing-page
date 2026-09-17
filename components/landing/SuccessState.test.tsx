import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SuccessState } from "./SuccessState";

describe("SuccessState", () => {
  it("confirms the offer and representative follow-up without product content", () => {
    render(
      <SuccessState
        isRepeatCustomer={false}
        offerCopy="Your 30% offer has been unlocked."
        contactCopy="An MK Jewels representative will contact you shortly."
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Your 30% offer has been unlocked." }),
    ).toBeVisible();
    expect(screen.getByText(/representative will contact you shortly/i)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/MK001|product|specification|price/i);
  });
});
