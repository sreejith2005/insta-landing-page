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
  -> customer submits name, mobile, PIN code, and city
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

Product_Master fields never enter the customer-facing component tree. The lead
API success response contains only `inquiryId`, `customerId`, and
`isRepeatCustomer`.

## URL contract

Required parameters:

- `product`: canonical Product_Master `product_id`
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

### `Product_Master`

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

The first six columns are the operational mapping. `category`, `collection`,
and `campaign_name` are optional reporting fields. One row represents one
product/Reel/campaign tuple. `product_name` is stored on accepted inquiries for
internal reporting but is never displayed or returned to the browser.

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
```

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

The repository provides `countInquiriesForContext({ productId, reelId?,
campaignId?, since? })`. It counts real stored inquiries matching every
supplied filter. This phase exposes no public count endpoint and renders no
counter.

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

The four tab-name variables have safe defaults. Confirmation copy and the
future brand-video URL are public presentation configuration. The video URL is
validated but not rendered in this phase.

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

- [Product_Master import and migration](docs/PRODUCT_IMPORT.md)
- [ManyChat contract](docs/MANYCHAT.md)
- [Production launch checklist](docs/PRODUCTION_LAUNCH.md)
- [Next redesign inputs](docs/PHASE_2.md)

This repository task does not deploy or mutate external services.
