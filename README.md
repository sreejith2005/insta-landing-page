# MK Jewels Instagram Lead Funnel

A reusable Next.js lead funnel for Instagram Reel and ManyChat traffic.

> **The Product ID is attribution data, not customer-facing product content.**

The application validates an exact active product/Reel/campaign mapping,
captures a customer enquiry, preserves campaign attribution, and confirms that
the configured offer is unlocked. It does not display a product image, product
name, product ID, specifications, price, or catalogue content.

## Customer journey

```text
Instagram Reel
  -> ManyChat resolves the requested product
  -> /instagram receives product + reel + campaign
  -> server validates the exact active tuple
  -> customer unlocks the approved offer and submits name, mobile, PIN code, and city
  -> customer and inquiry are stored
  -> generic offer/contact confirmation is shown
```

## Local development

Requirements: Node.js compatible with Next.js 16 and npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Copy `.env.example` to `.env.local`. Use `DATA_PROVIDER=preview` locally. The
preview provider is rejected when `NODE_ENV=production`.

Example URL:

```text
http://localhost:3000/instagram?product=MKBR639&reel=R123&campaign=RAKHI26&source=manychat
```

## Architecture

- `app/instagram/page.tsx` parses the URL and resolves the server-only context.
- `lib/products/resolve-product.ts` enforces the exact active tuple.
- `components/landing/FunnelExperience.tsx` owns form/confirmation state.
- `app/api/lead/route.ts` applies request guards, rate limiting, and Zod validation.
- `lib/leads/submit-lead.ts` persists the lead and records lifecycle events.
- `lib/providers/preview-repository.ts` is development/test storage.
- `lib/providers/google-sheets-repository.ts` is production storage.

Product and map fields never enter the customer-facing component tree. The lead
API success response contains only `inquiryId`, `customerId`, and
`isRepeatCustomer`.

## URL contract

Required parameters:

- `product`: canonical `Products.product_id`
- `reel`: originating `reel_id`
- `campaign`: originating `campaign_id`

Optional attribution:

- `source`: `instagram`, `manychat`, `whatsapp`, or `direct`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

All three required identifiers must match one active row. The application never
resolves free text or `product_position`; ManyChat does that before making the
URL. See [docs/MANYCHAT.md](docs/MANYCHAT.md).

## Google Sheets

Share one spreadsheet with the least-privilege service account. Reads and
writes are header-indexed, so columns may be reordered, but their names must
match exactly.

### `Products` and `Reel_Product_Map`

`Products` (tab name from `GOOGLE_PRODUCT_SHEET`) holds one row per product:

```text
product_id
product_name
reel_id
campaign_id
product_position
active_status
category
collection
campaign_name
```

`Reel_Product_Map` (tab name from `GOOGLE_REEL_MAP_SHEET`) decides which
product/Reel/campaign links are valid:

```text
reel_id
campaign_id
product_position
product_id
active_status
```

A link resolves only when a map row matches the exact `product_id + reel_id +
campaign_id` **and** that `product_id` exists in `Products`. It is active only
when the map row is active and the product's `active_status` (if filled) is
active. Position comes from the map row, so one product can appear in several
Reels. `product_name`, `category`, `collection` and `campaign_name` are internal
reporting fields copied from `Products`; they are never shown to customers.
Blank map rows are ignored.

Setting `GOOGLE_REEL_MAP_SHEET=` (empty) falls back to the flat mode, where each
`Products` row is itself one authoritative tuple. If the configured map tab does
not exist, the app logs a warning and uses flat mode.

### `Customers`

```text
customer_id
created_at
name
phone_normalized
pin_code
city
first_source
```

### `Inquiries`

```text
inquiry_id
customer_id
created_at
name
phone_normalized
pin_code
city
is_repeat_customer
product_id
product_name
reel_id
campaign_id
source
utm_source
utm_medium
utm_campaign
utm_content
utm_term
session_id
landing_page_version
idempotency_key
reference_number
```

`reference_number` is the same value as the Instagram FMS tab's
`REFERENCE NUMBER`. The Bookings tab looks it up by `inquiry_id` (see
[docs/BOOKINGS.md](docs/BOOKINGS.md)).

`phone_normalized` identifies a customer, not an inquiry. A returning phone
reuses its customer record and creates a new enquiry unless the exact
idempotency key is replayed.

### `Events`

```text
created_at
event_name
session_id
inquiry_id
customer_id
product_id
reel_id
campaign_id
source
landing_page_version
idempotency_key
metadata_json
```

Active events are `landing_view`, `context_resolved`, `context_failed`,
`form_started`, `form_validation_failed`, `form_submitted`,
`repeat_customer_detected`, and `offer_unlocked`. Analytics do not contain
customer name, mobile number, PIN code, or city.

## Truthful inquiry counts

The hero pill shows real accepted inquiries for the validated
`product_id + reel_id + campaign_id`, read on the server through
`countInquiriesForContext`. It is configured with environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `SHOW_INQUIRY_COUNT` | `true` | Show the pill at all |
| `INQUIRY_COUNT_MODE` | `total` | `total`: all accepted inquiries. `recent`: only the last `INQUIRY_COUNT_RECENT_HOURS` |
| `INQUIRY_COUNT_RECENT_HOURS` | `24` | Window for recent mode |
| `INQUIRY_COUNT_SHOW_LIVE` | `false` | In recent mode only, label as "X customers enquiring ● LIVE" |
| `INQUIRY_COUNT_MINIMUM` | `1` | Hide counts below this. Zero is always hidden |

Total mode reads "X enquiries received for this selection"; recent mode without
LIVE reads "X enquiries in the last N hours". Failed or slow (>1.2 s) lookups
hide the pill, and results are cached for 60 s per selection. There is no public
count endpoint and no random fallback. This dynamic count is deliberately
separate from the static, approved trust metrics.

## Landing page content

Approved trust metrics, Google reviews, testimonials and media live in
`config/social-proof.ts` and start empty; empty sections are removed in
production. Clearly labelled development placeholders
(`config/social-proof.development.ts`) fill empty sections in `next dev`
(`SHOW_DEVELOPMENT_SOCIAL_PROOF=false` turns them off) and can never render when
`NODE_ENV=production`. The brand film lives at `public/brand/mk-jewels-intro.mp4`.
See `docs/CONTENT_ASSETS.md`.

## Security and reliability

- Server-authoritative Zod validation
- Indian mobile normalization and PIN validation
- Exact active context validation
- Same-origin, JSON content-type, and body-size guards
- Honeypot and minimum elapsed-time heuristic
- Idempotent submissions
- Upstash-backed distributed rate limiting in production
- Customer-safe errors and PII-safe logs/events
- Server-only Google credentials
- Restrictive CSP and security headers

## Environment variables

See `.env.example`. Production requires:

- `DATA_PROVIDER=google-sheets`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SPREADSHEET_ID`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The four tab-name variables have safe defaults. Offer/success copy, inquiry
visibility, and approved trust metrics live in typed presentation
configuration. The optional public brand-video URL is HTTPS-validated and
supports hosted MP4, YouTube, or Vimeo.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd audit --omit=dev
```

Playwright forces `DATA_PROVIDER=preview` and does not reuse an existing local
server, preventing `.env.local` production settings from contaminating tests.

## Migration and deployment

- [Products / Reel_Product_Map import](docs/PRODUCT_IMPORT.md)
- [ManyChat contract](docs/MANYCHAT.md)
- [Production launch checklist](docs/PRODUCTION_LAUNCH.md)
- [Next redesign inputs](docs/PHASE_2.md)

This repository task does not deploy or mutate external services.
