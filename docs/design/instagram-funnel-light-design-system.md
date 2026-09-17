# MK Jewels Instagram funnel light design system

## Source of truth

- Live `mkjewels.in` visual language reviewed on 2026-09-17.
- Official logo: `public/brand/mk-jewels-gold-on-white.jpeg`.
- Layout references: `instagram-funnel-light-mobile.png`, `instagram-funnel-light-desktop.png`, and `instagram-funnel-light-success.png`.

## Tokens and typography

- Background: true white with sparse pale warm-neutral section bands.
- Text: near-black `#1d1d1d`; secondary text `#626262`.
- Accent: champagne gold `#d9b774`; use for rules, borders, and small details.
- Display: Antic Didone-style high-contrast serif.
- UI: Figtree-style sans serif with deliberate uppercase tracking for small labels and calls to action.
- Borders are fine hairlines; shadows are subtle and limited to the form/confirmation surface.

## Component and layout rules (rich funnel, 2026-09-17)

Supersedes the earlier sparse layout. QA screenshots: `docs/design/qa-2026-09-17-proof/`.

- Section order and rhythm: dark announcement → white header → ivory hero
  (enquiry pill above headline) → dark brand-film section → white trust metrics
  → warm "why" → dark CTA → white Google reviews → ivory testimonials →
  (media proof) → dark "Still thinking" CTA → white three steps → warm form →
  dark reassurance → footer. With a film, mobile shows the film and its CTA in
  place of the hero card and hero CTA.
- Palette additions: charcoal `#12110e`, ivory `#f8f4ed`, warm `#f0e8db`,
  gold text on light `#86683c` (AA on ivory).
- Hero: desktop two columns (copy left, film/invitation card right); mobile
  proof pill → headline → offer → film/card → CTA → supporting copy.
- Proof pill shows only a real server-side enquiry count above the configured
  threshold; the LIVE marker only for an explicitly enabled recent window.
- Film loads nothing but a poster layer until played; without a film the hero
  uses a dark invitation card built from the real logo and approved offer.
- All CTAs are links to the single form (`#enquire`) that smooth-scroll and
  focus Full Name. A mobile sticky CTA shows after the hero CTA leaves view and
  hides whenever the form section is near.
- Proof sections (metrics, reviews, testimonials, media) are data-driven from
  `config/social-proof.ts` and removed when empty. No fabricated proof, no
  countdowns, no automatic carousels.
- Inputs ≥ 52px; interactive targets ≥ 44px; motion is reveal-on-scroll,
  one-time count-up, CTA arrow nudge, and success check draw — all disabled
  under `prefers-reduced-motion`.
- Success replaces the page in place: dark confirmation hero with first name,
  then a three-step "What happens next".
