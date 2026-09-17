import Image from "next/image";

import type { MediaProofItem } from "@/config/social-proof";

/** Approved customer/event/press imagery. Hidden when empty; never placeholder-filled. */
export function MediaProof({ items }: { items: readonly MediaProofItem[] }) {
  if (!items.length) return null;
  return (
    <section className="band band-white media-band" aria-labelledby="media-heading">
      <div className="container container-wide">
        <div className="section-intro">
          <p className="eyebrow">From our community</p>
          <h2 id="media-heading">Worn, celebrated, shared</h2>
        </div>
        <ul className="media-grid">
          {items.slice(0, 8).map((item) => (
            <li key={item.src}>
              <figure>
                <div className="media-frame">
                  <Image src={item.src} alt={item.alt} fill sizes="(min-width: 960px) 300px, 50vw" />
                </div>
                {item.caption ? <figcaption>{item.caption}</figcaption> : null}
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
