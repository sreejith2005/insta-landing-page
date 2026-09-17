import Image from "next/image";

import type { Testimonial } from "@/config/social-proof";
import { VideoPlayer } from "@/components/landing/BrandVideo";
import { Reveal } from "@/components/landing/motion";
import { PlaceholderTag } from "./PlaceholderTag";

function Story({ item, featured }: { item: Testimonial; featured?: boolean }) {
  return (
    <figure className={`testimonial kind-${item.type}${featured ? " is-featured" : ""}`}>
      {item.type === "image" && item.asset ? (
        <div className="testimonial-media">
          <Image
            src={item.asset}
            alt={`${item.name}${item.context ? `, ${item.context}` : ""}`}
            fill
            sizes={featured ? "(min-width: 960px) 560px, 100vw" : "(min-width: 960px) 260px, 100vw"}
          />
        </div>
      ) : null}
      {item.type === "video" && item.asset ? (
        <VideoPlayer
          video={{ kind: "file", src: item.asset, poster: item.poster, aspectRatio: "4 / 5" }}
          label={`${item.name}'s story`}
          className="testimonial-media"
        />
      ) : null}
      <div className="testimonial-body">
        <span className="quote-mark" aria-hidden="true">“</span>
        <blockquote>
          <p>{item.quote}</p>
        </blockquote>
        <figcaption>
          <span className="testimonial-rule" aria-hidden="true" />
          <span>
            <strong>{item.name}</strong>
            {item.context ? <small>{item.context}</small> : null}
          </span>
        </figcaption>
      </div>
    </figure>
  );
}

export function Testimonials({
  items,
  placeholder = false,
}: {
  items: readonly Testimonial[];
  placeholder?: boolean;
}) {
  if (!items.length) return null;
  const [featured, ...supporting] = items;

  return (
    <section className="band band-ivory stories-band" aria-labelledby="stories-heading" data-placeholder={placeholder || undefined}>
      <div className="container container-wide">
        {placeholder ? <PlaceholderTag>customer testimonials</PlaceholderTag> : null}
        <Reveal className="section-intro">
          <p className="eyebrow">Customer stories</p>
          <h2 id="stories-heading">
            Jewellery chosen for <em>meaningful moments</em>
          </h2>
        </Reveal>
        <Reveal className={`stories-layout${supporting.length ? "" : " is-single"}`}>
          <Story item={featured} featured />
          {supporting.length ? (
            <div className="stories-supporting">
              {supporting.slice(0, 4).map((item, index) => (
                <Story item={item} key={`${item.name}-${index}`} />
              ))}
            </div>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
