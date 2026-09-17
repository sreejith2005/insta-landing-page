"use client";

import { useEffect, useState } from "react";

import { experienceCopy } from "@/config/experience";
import { FORM_SECTION_ID, ScrollCta } from "./motion";

/** The sticky bar appears once this hero section has scrolled out of view. */
export const HERO_SECTION_ID = "hero";

/**
 * Mobile-only bottom CTA. It appears once the hero has scrolled away, and
 * hides whenever any part of the form section (or the film) is on screen, so it
 * can never cover a field, the submit button, the privacy copy or the player.
 */
export function StickyCta() {
  const [pastHero, setPastHero] = useState(false);
  const [formNear, setFormNear] = useState(false);
  const [filmVisible, setFilmVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(HERO_SECTION_ID);
    const form = document.getElementById(FORM_SECTION_ID);
    if (!hero || !form || typeof IntersectionObserver === "undefined") return;

    const heroObserver = new IntersectionObserver(([entry]) => {
      setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    // The extended bottom margin hides the bar before the form scrolls into it.
    const formObserver = new IntersectionObserver(
      ([entry]) => setFormNear(entry.isIntersecting),
      { rootMargin: "0px 0px 120px 0px" },
    );
    // The film section carries its own CTA; the bar would only cover the player.
    const film = document.querySelector(".video-band");
    const filmObserver = new IntersectionObserver(([entry]) => setFilmVisible(entry.isIntersecting));
    heroObserver.observe(hero);
    formObserver.observe(form);
    if (film) filmObserver.observe(film);
    return () => {
      heroObserver.disconnect();
      formObserver.disconnect();
      filmObserver.disconnect();
    };
  }, []);

  const visible = pastHero && !formNear && !filmVisible && !dismissed;

  return (
    <div className="sticky-cta" data-visible={visible} aria-hidden={!visible} inert={!visible}>
      <ScrollCta source="sticky" className="cta-link sticky-cta-link">
        {experienceCopy.stickyCtaText}
      </ScrollCta>
      <button type="button" className="sticky-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
