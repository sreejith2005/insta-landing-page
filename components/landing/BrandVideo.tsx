"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

/** Autoplay parameters for the providers' own players, which carry their own unmute control. */
function providerAutoplaySrc(video: Pick<BrandVideoSource, "kind" | "src">) {
  return video.kind === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${video.src}?autoplay=1&mute=1&loop=1&playlist=${video.src}&playsinline=1&rel=0&modestbranding=1`
    : `https://player.vimeo.com/video/${video.src}?autoplay=1&muted=1&loop=1&playsinline=1&title=0&byline=0&portrait=0`;
}

/**
 * Full-width brand film at the top of the page. Starts playing muted on load
 * (browsers only autoplay muted media) with a visible sound control; a pause
 * control keeps the moving picture stoppable. Hosted YouTube/Vimeo films use
 * the provider's player, whose own controls include unmute.
 */
export function HeroFilm({ video }: { video: BrandVideoSource }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // React does not write `muted` into server HTML, so autoplay is started
    // explicitly once the element is muted on the client.
    node.muted = true;
    Promise.resolve()
      .then(() => node.play())
      .catch(() => setPaused(true));
  }, []);

  function toggleSound() {
    const node = ref.current;
    if (!node) return;
    node.muted = !node.muted;
    setMuted(node.muted);
    if (!node.muted && node.paused) togglePlayback();
  }

  function togglePlayback() {
    const node = ref.current;
    if (!node) return;
    if (node.paused) {
      Promise.resolve()
        .then(() => node.play())
        .then(() => setPaused(false))
        .catch(() => setPaused(true));
    } else {
      node.pause();
      setPaused(true);
    }
  }

  return (
    <section className="hero-film" aria-label={video.title}>
      <div className="hero-film-frame" style={{ aspectRatio: video.aspectRatio }}>
        {video.kind === "file" ? (
          <>
            <video ref={ref} aria-label={video.title} autoPlay muted loop playsInline preload="auto" poster={video.poster}>
              <source src={video.src} />
              Your browser does not support this video.
            </video>
            <div className="hero-film-controls">
              <button type="button" className="film-control" onClick={togglePlayback}>
                {paused ? "Play" : "Pause"}
              </button>
              <button type="button" className="film-control film-sound" onClick={toggleSound}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 9v6h4l5 4V5L8 9z" />
                  {muted ? <path className="film-sound-off" d="m16 9 5 6m0-6-5 6" /> : <path className="film-sound-on" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
                </svg>
                {muted ? "Unmute" : "Mute"}
              </button>
            </div>
          </>
        ) : (
          <iframe
            src={providerAutoplaySrc(video)}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
      </div>
    </section>
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

type VideoCopy = { eyebrow: string; headingLines: readonly string[]; description: string };

/**
 * Large cinematic film section that plays only when pressed. `showCta` adds
 * the scroll-to-form call to action, which only makes sense before submission.
 */
export function VideoSection({
  video,
  copy = brandVideoConfig,
  showCta = true,
  ctaId,
}: {
  video: BrandVideoSource;
  copy?: VideoCopy;
  showCta?: boolean;
  ctaId?: string;
}) {
  return (
    <section className="band band-dark video-band" aria-labelledby="video-heading">
      <div className="container container-wide">
        <Reveal className="video-intro">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="video-heading">
            {copy.headingLines.map((line, index) => (
              <span className={index ? "headline-accent" : undefined} key={line}>
                {line}{" "}
              </span>
            ))}
          </h2>
          <p className="video-lede">{copy.description}</p>
        </Reveal>
        <div className="video-stage">
          <VideoPlayer video={video} label={video.title} className="feature-video" />
        </div>
        {showCta ? (
          <div className="video-actions">
            <ScrollCta source="video" className="cta-link cta-gold" id={ctaId}>
              {experienceCopy.videoCtaText}
            </ScrollCta>
            <p className="cta-microcopy on-dark">{experienceCopy.ctaMicrocopy}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
