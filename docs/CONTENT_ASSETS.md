# Landing page content and assets

Every piece of proof on the Instagram landing page must be real and approved by
MK Jewels. Nothing is generated, padded or randomised. A section with no
approved content is removed from the production page.

## Directory layout

```
public/
  brand/
    mk-jewels-intro.mp4      ← brand film (16:9)
    video-poster.jpg         ← poster frame shown before play (1280×720 JPEG)
  testimonials/              ← testimonial photos and videos
  reviews/                   ← optional review-related images (e.g. screenshots you are licensed to show)
  media-proof/               ← customer, bridal, store-event and press photos
config/
  social-proof.ts            ← APPROVED metrics, Google reviews, testimonials, media
  social-proof.development.ts← DEVELOPMENT PLACEHOLDERS (never shipped to production)
  experience.ts              ← copy, film section text, enquiry-count defaults
```

Files in `public/` are referenced by root-relative path, e.g.
`/testimonials/priya-bridal.jpg`.

## Brand film

1. Place the film at `public/brand/mk-jewels-intro.mp4` and a poster frame at
   `public/brand/video-poster.jpg`.
2. Set `NEXT_PUBLIC_BRAND_VIDEO_URL=/brand/mk-jewels-intro.mp4`.
   - In `next dev` the file is used automatically even without the variable.
   - In production the variable is required; without it the film section is
     removed cleanly.
   - A hosted `https://` MP4, YouTube or Vimeo link also works.
3. Section text (eyebrow, heading, description) and the aspect ratio live in
   `brandVideoConfig` in `config/experience.ts`.

To replace the film, overwrite `mk-jewels-intro.mp4` (and `video-poster.jpg`)
with the new files. Nothing downloads until the customer presses play, and sound
never starts on its own.

Recommended encoding for Indian mobile data: H.264 MP4, 720p, 1.5–2.5 Mbps,
AAC audio, **`+faststart`** (moov atom at the start), under ~10 MB. The current
file is 7 MB but its moov atom is at the end, so playback starts after a few
extra range requests; re-export with fast start when convenient:

```
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k -movflags +faststart public/brand/mk-jewels-intro.mp4
```

## Trust metrics — `socialProof.trustMetrics`

Approved static company facts only. Up to four are shown (4 columns desktop,
2×2 mobile).

```ts
trustMetrics: [
  { value: "1 Lakh+", label: "Customers Served" },
  { value: "5+", label: "Stores" },
],
```

These are separate from the enquiry pill in the hero, which is a live count of
real enquiries for the selection and is configured with environment variables
(see README "Truthful inquiry counts").

## Google reviews — `socialProof.googleReviews`

Curated by hand from the public Google Business Profile. No scraping.

```ts
googleReviews: {
  enabled: true,
  rating: "4.8",            // exactly as shown on Google
  reviewCount: "1,240",     // exactly as shown on Google
  profileUrl: "https://maps.app.goo.gl/…",
  reviews: [
    { name: "Reviewer display name", rating: 5, text: "Verbatim review text.", date: "March 2026" },
  ],
},
```

The section renders only when `enabled` is true and `rating`, `reviewCount` and
at least one review are present. Refresh the rating and count periodically.

## Testimonials — `socialProof.testimonials`

Obtain the customer's consent for name, quote and any photo or video. The first
entry is the large featured story; up to four more appear beside it.

```ts
testimonials: [
  { type: "image", name: "Priya S.", context: "Bridal customer, Mumbai",
    quote: "…", asset: "/testimonials/priya-bridal.jpg" },   // 4:5 portrait works best
  { type: "video", name: "Rohan & Meera", quote: "…",
    asset: "/testimonials/rohan-meera.mp4", poster: "/testimonials/rohan-meera.jpg" },
  { type: "text", name: "Anjali K.", context: "Repeat customer", quote: "…" },
],
```

Image and video testimonials without an `asset` are ignored.

## Media proof — `socialProof.mediaProof`

Optional grid of real customer, bridal, store-event or press imagery with usage
rights. Hidden when empty; never filled with placeholders.

```ts
mediaProof: [
  { src: "/media-proof/store-launch-2026.jpg", alt: "Customers at the store launch", caption: "Store launch, 2026" },
],
```

## Development placeholders

`config/social-proof.development.ts` holds obviously fake metrics, reviews and
stories so the page can be reviewed visually before real content exists.

- Used only for sections with no approved content.
- On by default in `next dev`; set `SHOW_DEVELOPMENT_SOCIAL_PROOF=false` to see
  the production layout locally.
- Always off when `NODE_ENV=production`, whatever the variable says
  (`lib/social-proof/resolve-social-proof.ts`, covered by tests).
- Every placeholder section shows a striped "Development placeholder · not
  approved for production" label.

## Enquiry count baseline

`inquiryProofConfig.auditedBaseline` in `config/experience.ts` can add an
independently verified historical count from another system. Only set it with
written MK Jewels approval (record it in `approvalReference`), and set `asOf` to
when that figure was taken so only later enquiries are added. Never use it to
make a small count look larger.
