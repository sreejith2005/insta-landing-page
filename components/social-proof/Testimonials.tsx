"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

import type { Testimonial } from "@/config/social-proof";
import { Reveal } from "@/components/landing/motion";
import { PlaceholderTag } from "./PlaceholderTag";

/**
 * One customer film. It stays a still, silent card until it is asked for:
 * pressing the card plays it muted (browsers only autoplay muted media) and the
 * sound control next to it is the customer's own decision to make. Only the
 * film that was last pressed keeps playing — `onPlaying` tells the strip to
 * pause the others, so a swipe never leaves two voices talking at once.
 */
function StoryCard({
  item,
  index,
  onPlaying,
  registerVideo,
}: {
  item: Testimonial;
  index: number;
  onPlaying: (index: number) => void;
  registerVideo: (index: number, node: HTMLVideoElement | null) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(true);
  const label = item.name ? `${item.name}'s story` : `Customer story ${index + 1}`;

  const attach = useCallback(
    (node: HTMLVideoElement | null) => {
      video.current = node;
      registerVideo(index, node);
    },
    [index, registerVideo],
  );

  function play() {
    const node = video.current;
    if (!node) return;
    node.muted = muted;
    setStarted(true);
    onPlaying(index);
    Promise.resolve()
      .then(() => node.play())
      .then(() => setPaused(false))
      .catch(() => setPaused(true));
  }

  function toggle() {
    const node = video.current;
    if (!node) return;
    if (node.paused) return play();
    node.pause();
    setPaused(true);
  }

  function toggleSound() {
    const node = video.current;
    if (!node) return;
    node.muted = !node.muted;
    setMuted(node.muted);
    // Unmuting is a request to hear it, so a still or paused film starts.
    if (!node.muted && node.paused) play();
  }

  return (
    <figure className="story-card">
      <div className="story-media">
        <video
          ref={attach}
          aria-label={label}
          playsInline
          // Metadata alone is enough to paint the first frame as the poster,
          // so five films cost five headers rather than five downloads.
          preload="metadata"
          poster={item.poster}
          onPause={() => setPaused(true)}
          onPlay={() => setPaused(false)}
          onEnded={() => setStarted(false)}
        >
          <source src={item.asset} />
          Your browser does not support this video.
        </video>
        {item.poster && !started ? (
          <Image className="story-poster" src={item.poster} alt="" fill sizes="(min-width: 720px) 300px, 78vw" />
        ) : null}
        <button type="button" className="story-play" onClick={toggle} aria-pressed={!paused}>
          <span className="story-play-mark" aria-hidden="true">
            {paused ? (
              <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24"><path d="M9 5h2.5v14H9zm5 0h2.5v14H14z" /></svg>
            )}
          </span>
          <span className="visually-hidden">{paused ? "Play" : "Pause"} {label}</span>
        </button>
        <button type="button" className="story-sound" onClick={toggleSound}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9z" />
            {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
          </svg>
          <span className="story-sound-text">{muted ? "Unmute" : "Mute"}</span>
        </button>
      </div>
      {item.quote || item.name || item.context ? (
        <figcaption className="story-caption">
          {item.quote ? <p className="story-quote">{item.quote}</p> : null}
          {item.name ? <strong>{item.name}</strong> : null}
          {item.context ? <small>{item.context}</small> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Customer films. A swipeable strip on phones and a grid from tablet up, so
 * five portrait films never become five cramped thumbnails.
 */
export function Testimonials({
  items,
  placeholder = false,
}: {
  items: readonly Testimonial[];
  placeholder?: boolean;
}) {
  const videos = useRef(new Map<number, HTMLVideoElement>());

  const registerVideo = useCallback((index: number, node: HTMLVideoElement | null) => {
    if (node) videos.current.set(index, node);
    else videos.current.delete(index);
  }, []);

  const onPlaying = useCallback((index: number) => {
    for (const [key, node] of videos.current) if (key !== index) node.pause();
  }, []);

  if (!items.length) return null;

  return (
    <section
      className="band band-ivory stories-band"
      aria-labelledby="stories-heading"
      data-placeholder={placeholder || undefined}
    >
      <div className="container container-wide">
        {placeholder ? <PlaceholderTag>customer testimonials</PlaceholderTag> : null}
        <Reveal className="section-intro">
          <p className="eyebrow">Customer stories</p>
          <h2 id="stories-heading">
            In our customers&rsquo; <em>own words</em>
          </h2>
        </Reveal>
        <ul className="stories-strip" data-count={items.length}>
          {items.map((item, index) => (
            <li key={item.asset}>
              <StoryCard item={item} index={index} onPlaying={onPlaying} registerVideo={registerVideo} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
