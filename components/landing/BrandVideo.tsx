"use client";

import Image from "next/image";
import { useState } from "react";

import { brandVideoConfig, experienceCopy } from "@/config/experience";
import type { BrandVideoSource } from "@/lib/media/brand-video";
import { Reveal, ScrollCta } from "./motion";

/**
 * Plays a film only after the customer asks: nothing but the poster layer is
 * loaded up front, so the hero never waits on video bytes or a third-party
 * player. Sound is never auto-started.
 */
export function VideoPlayer({
  video,
  label,
  className = "",
}: {
  video: Pick<BrandVideoSource, "kind" | "src" | "poster" | "aspectRatio">;
  label: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`video-card ${className}`} style={{ aspectRatio: video.aspectRatio }}>
      {playing ? (
        video.kind === "youtube" ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.src}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={label}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : video.kind === "vimeo" ? (
          <iframe
            src={`https://player.vimeo.com/video/${video.src}?autoplay=1&title=0&byline=0&portrait=0`}
            title={label}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            aria-label={label}
            controls
            autoPlay
            playsInline
            preload="auto"
            poster={video.poster}
          >
            <source src={video.src} />
            Your browser does not support this video.
          </video>
        )
      ) : (
        <button type="button" className="video-poster" onClick={() => setPlaying(true)}>
          {video.poster ? (
            <Image src={video.poster} alt="" fill sizes="(min-width: 1280px) 1180px, 100vw" />
          ) : (
            <span className="video-poster-brand" aria-hidden="true">
              <Image src="/brand/mk-jewels-gold-on-black.jpeg" alt="" width={1600} height={378} sizes="220px" />
            </span>
          )}
          <span className="video-play" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
          </span>
          <span className="video-caption">
            <span className="video-caption-kicker" aria-hidden="true">Watch the film</span>
            <span className="visually-hidden">Play video: </span>
            <span className="video-caption-title">{label}</span>
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * The hero's visual anchor: a dark invitation card built only from the real
 * logo and the approved offer. The brand film has its own section below.
 */
export function HeroMedia() {
  return (
    <div className="hero-media">
      <div className="invitation-card">
        <div className="invitation-inner">
          <div className="invitation-logo">
            <Image
              src="/brand/mk-jewels-gold-on-black.jpeg"
              alt="MK Jewels"
              width={1600}
              height={378}
              sizes="(min-width: 960px) 260px, 180px"
              priority
            />
          </div>
          <p className="invitation-kicker">{experienceCopy.announcement}</p>
          <p className="invitation-figure" aria-hidden="true">
            <span className="invitation-upto">up to</span>
            30<span className="invitation-percent">%</span>
          </p>
          <p className="invitation-label"><span className="visually-hidden">Up to 30% </span>off making charges</p>
          <p className="invitation-note">Reserved for enquiries from this private link</p>
        </div>
      </div>
    </div>
  );
}

/** Large cinematic brand-film section placed directly after the hero. */
export function VideoSection({ video, ctaId }: { video: BrandVideoSource; ctaId?: string }) {
  return (
    <section className="band band-dark video-band" aria-labelledby="video-heading">
      <div className="container container-wide">
        <Reveal className="video-intro">
          <p className="eyebrow">{brandVideoConfig.eyebrow}</p>
          <h2 id="video-heading">
            {brandVideoConfig.headingLines.map((line, index) => (
              <span className={index ? "headline-accent" : undefined} key={line}>
                {line}{" "}
              </span>
            ))}
          </h2>
          <p className="video-lede">{brandVideoConfig.description}</p>
        </Reveal>
        <div className="video-stage">
          <VideoPlayer video={video} label={video.title} className="feature-video" />
        </div>
        <div className="video-actions">
          <ScrollCta source="video" className="cta-link cta-gold" id={ctaId}>
            {experienceCopy.videoCtaText}
          </ScrollCta>
          <p className="cta-microcopy on-dark">{experienceCopy.ctaMicrocopy}</p>
        </div>
      </div>
    </section>
  );
}
