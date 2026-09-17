import type { GoogleReviewsContent } from "@/config/social-proof";
import { Reveal } from "@/components/landing/motion";
import { ProofCarousel, Stars } from "@/components/landing/ProofCarousel";
import { PlaceholderTag } from "./PlaceholderTag";

/**
 * Curated Google reviews. Receives only content already resolved on the server:
 * approved data, or (outside production) labelled development placeholders.
 */
export function GoogleReviews({
  content,
  placeholder = false,
}: {
  content: GoogleReviewsContent | null;
  placeholder?: boolean;
}) {
  if (!content?.enabled || !content.reviews.length) return null;
  const rating = Number.parseFloat(content.rating ?? "");

  return (
    <section className="band band-white reviews-band" aria-labelledby="reviews-heading" data-placeholder={placeholder || undefined}>
      <div className="container container-wide">
        {placeholder ? <PlaceholderTag>Google reviews</PlaceholderTag> : null}
        <Reveal className="reviews-head">
          <div className="section-intro align-left">
            <p className="eyebrow">Customer reviews</p>
            <h2 id="reviews-heading">
              Trusted by <em>jewellery buyers</em>
            </h2>
          </div>
          {content.rating ? (
            <div className="rating-summary">
              <span className="google-mark" aria-hidden="true">G</span>
              <strong>{content.rating}</strong>
              <div>
                {Number.isFinite(rating) ? <Stars rating={rating} className="stars stars-large" /> : null}
                {content.reviewCount ? <p>{content.reviewCount} reviews on Google</p> : null}
              </div>
            </div>
          ) : null}
        </Reveal>
        <ProofCarousel label="Google reviews" className="reviews-carousel">
          {content.reviews.map((review, index) => (
            <li className="review-card" key={`${review.name}-${index}`}>
              <span className="review-quote" aria-hidden="true">“</span>
              <Stars rating={review.rating} />
              <blockquote>
                <p>{review.text}</p>
              </blockquote>
              <footer>
                <span className="review-avatar" aria-hidden="true">{review.name.trim().charAt(0)}</span>
                <span>
                  <strong>{review.name}</strong>
                  <small>{review.date ? `${review.date} · Google` : "Google review"}</small>
                </span>
              </footer>
            </li>
          ))}
        </ProofCarousel>
        {content.profileUrl ? (
          <div className="band-actions">
            <a className="text-link" href={content.profileUrl} target="_blank" rel="noreferrer">
              Read all reviews on Google
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
