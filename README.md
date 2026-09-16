# MK Jewels Instagram Lead Funnel

One mobile-first Next.js application for Instagram/ManyChat product enquiries. It
validates Reel, campaign, and canonical product context; collects the four
approved lead fields; stores an attributable inquiry through a server-only
provider; reveals the approved product without price; and prioritises private
appointments.

The authoritative requirements are in `MK_Jewels_Instagram_Lead_Funnel_PRD.docx`.
Design and plan documents are under `docs/superpowers/`. The ManyChat contract is
in [`docs/MANYCHAT.md`](docs/MANYCHAT.md).

## Contents

- [Architecture](#architecture)
- [Install and run locally](#install-and-run-locally)
- [Runtime modes](#runtime-modes)
- [Google Sheets](#google-sheets)
- [Product Master](#product-master)
- [Adding a product](#adding-a-product)
- [Mapping a Reel](#mapping-a-reel)
- [Calendly](#calendly)
- [WhatsApp](#whatsapp)
- [ManyChat](#manychat)
- [Repeat customers](#repeat-customers)
- [Environment variables](#environment-variables)
- [Events](#events)
- [Deploying](#deploying)
- [Verification](#verification)
- [Security notes](#security-notes)

## Architecture

One dynamic application, never one page per product. `/instagram` is the only
customer-facing route; the Reel, campaign, and product arrive as query
parameters and are resolved against the Product Master at request time.

```text
ManyChat DM  ->  /instagram?product&reel&campaign
                      |
                      v
        incomingContextSchema        reject unknown source / malformed ids
                      |
                      v
        resolveProductContext        must match the exact product+reel+campaign
                      |              triple AND be active, or a recovery state
                      v
        FunnelExperience (client)    teaser + four-field form, no price
                      |
                      v  POST /api/lead
        leadSubmissionSchema         server-authoritative revalidation
        submitLead                   re-resolves the product, then persists
                      |
                      v
        FunnelRepository             Google Sheets today, FMS later
                      |
                      v
        ProductReveal (client)       approved image, specifications, no price
                      |
                      +-- Calendly embed (primary)
                      +-- WhatsApp / Request a Callback (secondary)
                      +-- POST /api/events throughout
```

| Layer | Location | Responsibility |
| --- | --- | --- |
| Route/context resolver | `app/instagram/page.tsx`, `lib/products/` | Validate incoming context, project safe public product data |
| Validation | `lib/validation/` | `lead-fields.ts` holds the dependency-free field rules shared with the browser; `schemas.ts` is the authoritative server schema |
| Lead service | `lib/leads/` | Normalisation, repeat detection, inquiry creation, idempotency |
| Persistence port | `lib/leads/contracts.ts` | `FunnelRepository` — the single interface to swap Sheets for the FMS |
| Providers | `lib/providers/` | `google-sheets-repository.ts` (production), `preview-repository.ts` (dev/test only) |
| Conversion | `components/scheduling/`, `components/conversion/`, `lib/conversion/` | Calendly embed, WhatsApp, callback |
| Analytics | `lib/analytics/`, `lib/attribution/` | Funnel events with a metadata allowlist |
| Configuration | `lib/config/env.ts`, `config/experience.ts` | Environment and business-configurable copy/flags |

The frontend never talks to Google. Every write goes through a server route, and
migrating off Sheets means implementing `FunnelRepository` once.

## Install and run locally

Requirements: Node.js 24 (or a currently supported release for Next.js 16) and npm.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open a valid context — the app has no product-specific pages, so every product
uses this one route:

```text
http://localhost:3000/instagram?product=MKBR639&reel=R123&campaign=RAKHI26
```

With `DATA_PROVIDER=preview` the page shows a "Development preview" marker,
product imagery stays unavailable rather than being fabricated, and records live
in process memory only. These are not production leads.

## Runtime modes

### Preview

`DATA_PROVIDER=preview` is permitted only when `NODE_ENV !== "production"`.
Fixtures live in `data/preview-products.ts`:

| Context | Exercises |
| --- | --- |
| `MKBR639` / `R123` / `RAKHI26` | Primary single-product journey |
| `RG5073` / `R456` / `BRIDAL26` | Multi-product Reel, position 1 |
| `RG5074` / `R456` / `BRIDAL26` | Multi-product Reel, position 2 |
| `INACTIVE01` / `R999` / `ARCHIVE` | Inactive product recovery state |

### Google Sheets

`DATA_PROVIDER=google-sheets` uses a server-only service account. Startup fails
fast if credentials are incomplete, and the preview provider is refused outright
in production.

## Google Sheets

Create one spreadsheet with five tabs and share it with the service account
email as **Editor**. Grant access to this spreadsheet only.

Reads and writes are both header-indexed: the first row of each tab defines the
columns, so you may reorder or append columns without touching application code.
Column names must match exactly.

### `Product_Master`

`product_id`, `product_name`, `category`, `collection`, `reel_id`, `campaign_id`,
`product_position`, `active_status`, `image_url`, `image_alt`, `image_width`,
`image_height`, `specifications_json`, `offer_copy`, `offer_expires_at`,
`calendly_store_url`, `calendly_video_url`, `whatsapp_number`,
`whatsapp_template`, `whatsapp_enabled`, `callback_enabled`, `cta_order_json`

### `Customers`

`customer_id`, `created_at`, `name`, `phone_normalized`, `pin_code`, `city`,
`first_source`

One row per normalised phone number.

### `Inquiries`

`inquiry_id`, `customer_id`, `created_at`, `name`, `phone_normalized`,
`pin_code`, `city`, `is_repeat_customer`, `product_id`, `reel_id`, `campaign_id`,
`source`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`,
`session_id`, `landing_page_version`, `idempotency_key`

One row per accepted submission. **Phone number is not unique here** — a
returning customer keeps their `customer_id` and gains a new `inquiry_id`.

### `Events`

`created_at`, `event_name`, `session_id`, `inquiry_id`, `customer_id`,
`product_id`, `reel_id`, `campaign_id`, `source`, `landing_page_version`,
`idempotency_key`, `metadata_json`

### `Callback_Requests`

`callback_id`, `inquiry_id`, `session_id`, `created_at`, `idempotency_key`,
`status`

## Product Master

Every visible element comes from a Product Master row or a global default. No
product-specific logic exists in any React component.

| Column | Effect |
| --- | --- |
| `active_status` | `TRUE`/`yes`/`1` reveals the product; anything else shows the unavailable state |
| `image_url` | Must be HTTPS and its host listed in `PRODUCT_IMAGE_HOSTS`. Blank shows the image-unavailable panel; nothing is ever substituted |
| `specifications_json` | `[{"label":"Purity","value":"18K"}]` — any labels, any count, any category |
| `offer_copy` | Campaign message shown before and after reveal. Leave blank for none |
| `offer_expires_at` | Optional ISO date. When set and still in the future, the reveal adds "Campaign offer valid until <date>" (IST) beneath `offer_copy`. It is the same for every visitor and never restarts per session; a blank or past date shows nothing |
| `calendly_store_url` / `calendly_video_url` | Per-product scheduling; falls back to the environment values |
| `whatsapp_number` / `whatsapp_template` | Per-product WhatsApp; falls back to the environment values |
| `whatsapp_enabled` / `callback_enabled` | Show or hide each secondary CTA |
| `cta_order_json` | `["store_visit","video_consultation","whatsapp","callback"]` |

Price is deliberately absent from the public product type. A `price` column in
the sheet is ignored and can never reach the browser.

## Adding a product

**No code change or redeploy is required.**

1. Add a row to `Product_Master`.
2. Fill `product_id`, `product_name`, `reel_id`, `campaign_id`.
3. Set `active_status` to `TRUE`.
4. Add `image_url` (HTTPS) and ensure its host is in `PRODUCT_IMAGE_HOSTS`.
5. Add `specifications_json`.
6. Leave Calendly/WhatsApp blank to inherit the global defaults.
7. Open `/instagram?product=<product_id>&reel=<reel_id>&campaign=<campaign_id>`.

## Mapping a Reel

- **One product:** one row carrying that Reel's `reel_id`, with
  `product_position` of `1`.
- **Multiple products:** one row per product, all sharing the `reel_id`, each
  with its own `product_position` (`1`, `2`, `3`…).

ManyChat converts "second product" into the canonical `product_id` before the
link is sent. The application never resolves a product from a position, because
a position in a URL is not trustworthy. See [`docs/MANYCHAT.md`](docs/MANYCHAT.md).

## Calendly

Set the global defaults, or override per product in `Product_Master`:

```bash
# Two distinct event types — see the warning below.
CALENDLY_STORE_VISIT_URL=https://calendly.com/mis-mkjewels/store-visit
CALENDLY_VIDEO_URL=https://calendly.com/mis-mkjewels/new-meeting
```

Create **two separate Calendly event types**. This is not a nicety: the only
scheduling link supplied so far resolves to an event type named *"MK Jewels -
Video Meet"* (30 min, web conferencing), so using it for
`CALENDLY_STORE_VISIT_URL` would book a video call for a customer who chose to
visit the store. A store-visit event type with the physical location must exist
before launch, and the chooser is only honest once the two URLs differ.

The reveal renders the official inline widget
(`assets.calendly.com/assets/external/widget.js`) inside a height-reserved,
width-safe frame that works in mobile portrait and landscape. Reel, campaign,
product, and source are forwarded as UTM values so attribution survives into
Calendly. If the widget cannot load within eight seconds — blocked script,
offline, CSP — a clean fallback link to the same scheduling page is shown. A
direct link is always present beneath the embed as well.

Hosts must be permitted by the CSP in `next.config.ts`; the default policy
already allows `calendly.com`, `*.calendly.com`, and `assets.calendly.com`.

### Booking capture

`CALENDLY_CAPTURE_BOOKINGS=false` by default. When enabled, the embed listens for
Calendly's `calendly.event_scheduled` `postMessage` (origin-checked against
`https://calendly.com`) and posts to `/api/appointment`, recording an
`appointment_booked` event linked to `inquiry_id`, `customer_id`, `product_id`,
`reel_id`, `campaign_id`, and the appointment type.

**Enable it only after verifying a real booking end to end.** While disabled the
endpoint returns 404 and the funnel does not claim bookings it cannot prove.

## WhatsApp

```bash
WHATSAPP_NUMBER=919876543210
WHATSAPP_MESSAGE_TEMPLATE=Hello MK Jewels, I would like to know more about {productName} ({productId}). My enquiry reference is {inquiryId}.
```

Digits only, including country code. Placeholders `{productId}`,
`{productName}`, and `{inquiryId}` are the only ones substituted — name, phone,
PIN code, and city can never be injected into the message. Per-product wording
goes in `whatsapp_template`. Leaving the number unset renders the CTA disabled
rather than broken.

## ManyChat

See [`docs/MANYCHAT.md`](docs/MANYCHAT.md) for the full contract, the parameter
table, and worked single-product and multi-product examples.

## Repeat customers

The **normalised phone number is the customer key, and it is deliberately not
the inquiry key.**

`lib/phone/normalize-indian-phone.ts` reduces input to ten digits, dropping
punctuation, spaces, and a `+91`/`91` prefix, and rejects anything that is not a
valid `6`–`9` leading Indian mobile number. `98765 43210`, `+91 98765 43210`,
and `09876543210` all normalise to `9876543210`.

On each accepted submission:

1. `Customers` is searched for that normalised number.
2. A match reuses the existing `customer_id`; no second customer row is created.
3. **A new `Inquiries` row is always written**, carrying its own `inquiry_id`
   and the new `product_id`, `reel_id`, `campaign_id`, and UTM values.
4. `is_repeat_customer` is set on that inquiry and a `repeat_customer_detected`
   event is recorded.
5. The customer sees "Welcome back" and can still book an appointment or request
   a callback for this new enquiry.

So a returning customer never overwrites their earlier interest, and a new Reel
or campaign is never lost.

Double submissions are handled separately, by idempotency rather than by phone
number. The browser sends
`lead:<sessionId>:<productId>:<reelId>:<campaignId>`; a replayed key returns the
original inquiry instead of writing a second row. Because the key includes the
whole triple, the same piece arriving from a *different* Reel or campaign in one
session is correctly treated as a new enquiry, not as a duplicate tap.

## Environment variables

| Variable | Browser-visible | Purpose |
| --- | --- | --- |
| `DATA_PROVIDER` | No | `preview` or `google-sheets` |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical application URL |
| `NEXT_PUBLIC_LANDING_PAGE_VERSION` | Yes | Attribution/release identifier |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No | Least-privilege service account |
| `GOOGLE_PRIVATE_KEY` | No | Service-account key; escaped newlines supported |
| `GOOGLE_SPREADSHEET_ID` | No | Staging spreadsheet |
| `GOOGLE_*_SHEET` | No | Optional tab-name overrides |
| `PRODUCT_IMAGE_HOSTS` | No | Comma-separated HTTPS image host allowlist (build time) |
| `CALENDLY_STORE_VISIT_URL` | No | Global store-visit scheduling default |
| `CALENDLY_VIDEO_URL` | No | Global video-consultation scheduling default |
| `CALENDLY_CAPTURE_BOOKINGS` | No | `true` enables `/api/appointment` booking capture |
| `WHATSAPP_NUMBER` | No | WhatsApp destination, digits only |
| `WHATSAPP_MESSAGE_TEMPLATE` | No | Prefilled message wording |
| `ASSISTED_SUPPORT_URL` | No | Recovery destination. When set, every unresolved-context state offers "Speak to a jewellery expert" |

Never expose Google credentials, the spreadsheet ID, or the service-account email
through a `NEXT_PUBLIC_*` variable. The WhatsApp number reaches the browser
through the validated product context, not through the build-time bundle, so it
stays configurable without a rebuild.

## Events

Recorded to the `Events` tab with timestamp, session, attribution, and
identifiers once known: `landing_view`, `product_context_resolved`,
`product_context_failed`, `form_started`, `form_validation_failed`,
`form_submitted`, `repeat_customer_detected`, `product_revealed`,
`calendly_opened`, `store_visit_selected`, `video_consultation_selected`,
`appointment_booked`, `whatsapp_clicked`, `callback_requested`.

Event metadata is restricted to an allowlist (`appointmentType`, `reason`,
`embedStatus`, `productPosition`, `hasImage`). Lead PII is dropped before the
write.

## Deploying

1. Host on a managed platform with HTTPS (Vercel or equivalent).
2. Set `DATA_PROVIDER=google-sheets` and all Google variables as secrets.
3. Set `NEXT_PUBLIC_APP_URL` to the production URL.
4. Add product image hosts to `PRODUCT_IMAGE_HOSTS` **before** building — it is
   read at build time.
5. Configure Calendly and WhatsApp values.
6. Replace the in-memory rate limiter with a shared durable limiter. The current
   one is per-process and does not hold across multiple instances.
7. Verify no secret appears in the client bundle, then run the checks below.
8. Keep `CALENDLY_CAPTURE_BOOKINGS=false` until a real booking is verified.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd audit --omit=dev
```

Playwright covers the valid journey, the repeat-customer/new-product journey,
parameter tampering, an unapproved `source`, missing and inactive contexts,
callback confirmation, Calendly fallback, and price and "Visit Website"
exclusion. Both the **form and the reveal** are checked for horizontal overflow
and for controls escaping the viewport at 320x568, 360x800, 390x844, 412x915,
844x390, 768x1024, and 1440x1000.

Each case sends a distinct `x-forwarded-for`, because the submission limiter
buckets by client address and would otherwise reject the later viewports as one
flooding client.

## Security notes

- Client validation is for UX only; every mutation revalidates with Zod on the
  server. The four field rules live in `lib/validation/lead-fields.ts`, which has
  no dependencies: the server schema is built from those predicates and the
  browser imports them directly, so there is one definition of "valid" and Zod
  never ships to a customer on mobile data.
- Mutations enforce JSON content type, a 16 KiB body limit, same-origin checks,
  generic customer-facing errors, and fixed-window rate limits.
- Product context must match the exact product/Reel/campaign tuple; a tampered
  parameter cannot surface another product.
- `source` is an allowlist, and UTM values are length- and character-bounded.
- A honeypot field plus a minimum submission time reject trivial bots.
- Lead, callback, and appointment writes are idempotent.
- The reveal happens only after the provider durably accepts the inquiry.
- Google credentials and adapters are server-only.
- CSP, frame denial, MIME-sniffing, permissions, and referrer headers are set in
  `next.config.ts`.

The in-memory rate limiter suits local validation, not horizontally scaled
production. See `docs/PHASE_2.md` for the remaining production checklist.
