import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { googleReviews } from "@/config/google-reviews";
import { GoogleReviews } from "./GoogleReviews";

describe("GoogleReviews", () => {
  it("renders every shipped review verbatim", () => {
    render(<GoogleReviews content={googleReviews} />);
    const cards = document.querySelectorAll(".review-card");
    expect(cards).toHaveLength(3);
    googleReviews.reviews.forEach((review, index) => {
      expect(cards[index].querySelector("blockquote p")?.textContent).toBe(review.text);
    });
  });

  it("links the author to their Google profile when one is given, and shows plain text when it is null", () => {
    render(<GoogleReviews content={googleReviews} />);

    const sneha = screen.getByRole("link", { name: "Sneha Sunderdas" });
    expect(sneha).toHaveAttribute("href", "https://www.google.com/maps/contrib/102154044133617547418/reviews?hl=en-IN");
    expect(sneha).toHaveAttribute("target", "_blank");
    expect(sneha).toHaveAttribute("rel", "noreferrer");
    expect(screen.getByRole("link", { name: "Farha Siddiqui" })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/contrib/110504287131016736832/reviews?hl=en-IN",
    );

    expect(screen.queryByRole("link", { name: "Rahul" })).not.toBeInTheDocument();
    expect(screen.getByText("Rahul").tagName).toBe("STRONG");
  });

  it("shows no stars or aggregate rating that was not supplied", () => {
    render(<GoogleReviews content={googleReviews} />);
    expect(screen.queryByRole("img", { name: /out of 5 stars/ })).not.toBeInTheDocument();
    expect(document.querySelector(".rating-summary")).toBeNull();
  });

  it("shows a review's stars only when it carries a rating", () => {
    render(
      <GoogleReviews
        content={{ enabled: true, reviews: [{ author: "Rated", profileUrl: null, rating: 5, text: "Rated review." }] }}
      />,
    );
    const card = document.querySelector<HTMLElement>(".review-card")!;
    expect(within(card).getByRole("img", { name: "5 out of 5 stars" })).toBeInTheDocument();
  });

  it("is not labelled as a placeholder by default", () => {
    render(<GoogleReviews content={googleReviews} />);
    expect(screen.queryByText(/Development placeholder/)).not.toBeInTheDocument();
  });
});
