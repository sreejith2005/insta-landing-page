# MK Jewels Instagram Lead Funnel

One mobile-first Next.js application for Instagram/ManyChat product enquiries. It validates Reel, campaign, and canonical product context; collects the four approved lead fields; stores an attributable inquiry through a server-only provider; reveals the approved product without price; and prioritizes private appointments.

The authoritative requirements are in `MK_Jewels_Instagram_Lead_Funnel_PRD.docx`. The implementation design and plan are under `docs/superpowers/`.

## Current Phase 1 status

- Complete customer experience and responsive states.
- Official supplied MK Jewels logo used in the header.
- One reusable route: `/instagram?product=MKBR639&reel=R123&campaign=RAKHI26`.
- Explicit non-production preview provider for local development and browser tests.
- Server-only Google Sheets adapter with header-driven Product Master and idempotent inquiry/callback writes.
- No price property in the public product contract or reveal UI.
- Missing, invalid, inactive, missing-image, submission-failure, success, callback, and Calendly-unavailable states.

Production is intentionally not represented as ready until the inputs listed in `docs/PHASE_2.md` are supplied and verified.

## Local setup

Requirements: Node.js 24 or a currently supported Node release for Next.js 16, and npm.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open:

```text
http://localhost:3000/instagram?product=MKBR639&reel=R123&campaign=RAKHI26
```

`DATA_PROVIDER=preview` is development/test only. The page displays a Development preview marker, product imagery remains unavailable instead of being fabricated, and the in-process records are not production storage.

## Runtime modes

### Preview

Use `DATA_PROVIDER=preview` only outside production. Preview data lives in `data/preview-products.ts`. Product `MKBR639`, Reel `R123`, and campaign `RAKHI26` provide the primary QA context. `INACTIVE01/R999/ARCHIVE` exercises the inactive state.

### Google Sheets

Use `DATA_PROVIDER=google-sheets` with server-only service-account configuration. The service account should have access only to the staging spreadsheet.

Required tabs and headers:

- `Product_Master`: `product_id`, `product_name`, `reel_id`, `campaign_id`, `active_status`, `image_url`, `image_alt`, `image_width`, `image_height`, `specifications_json`, `offer_copy`, `offer_expires_at`, `calendly_store_url`, `calendly_video_url`, `whatsapp_enabled`, `callback_enabled`, `cta_order_json`.
- `Customers`: `customer_id`, `created_at`, `name`, `phone_normalized`, `pin_code`, `city`.
- `Inquiries`: `inquiry_id`, `customer_id`, `created_at`, `name`, `phone_normalized`, `pin_code`, `city`, `is_repeat_customer`, `product_id`, `reel_id`, `campaign_id`, `source`, `session_id`, `landing_page_version`, `idempotency_key`.
- `Events`: `created_at`, `event_name`, `session_id`, `inquiry_id`, `customer_id`, `product_id`, `reel_id`, `campaign_id`, `source`, `landing_page_version`, `metadata_json`.
- `Callback_Requests`: `callback_id`, `inquiry_id`, `session_id`, `created_at`, `idempotency_key`, `status`.

Column order may change because reads are header-driven. Writes currently follow the documented order, so keep these write tabs aligned until the adapter is upgraded to header-indexed writes.

## Environment variables

| Variable | Browser-visible | Purpose |
| --- | --- | --- |
| `DATA_PROVIDER` | No | `preview` or `google-sheets` |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical application URL |
| `NEXT_PUBLIC_LANDING_PAGE_VERSION` | Yes | Attribution/release identifier |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No | Least-privilege service account |
| `GOOGLE_PRIVATE_KEY` | No | Service-account private key; escaped newlines supported |
| `GOOGLE_SPREADSHEET_ID` | No | Staging spreadsheet |
| `GOOGLE_*_SHEET` | No | Optional tab-name overrides |
| `PRODUCT_IMAGE_HOSTS` | No | Comma-separated HTTPS image host allowlist used at build time |
| `CALENDLY_STORE_VISIT_URL` | No | Server default for approved product mapping |
| `CALENDLY_VIDEO_URL` | No | Server default for approved product mapping |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Yes | WhatsApp destination used by the browser CTA |
| `ASSISTED_SUPPORT_URL` | No | Future recovery destination |

Never expose the Google private key, service-account email, or writable spreadsheet configuration through `NEXT_PUBLIC_*` variables.

## Validation and verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd audit --omit=dev
```

Playwright covers the valid funnel, invalid input, missing/inactive contexts, callback confirmation, Calendly fallback, price/Visit Website exclusions, and horizontal overflow at 320x568, 360x800, 390x844, 412x915, 844x390, 768x1024, and 1440x1000.

## Security notes

- Client validation is for UX; all mutations revalidate with Zod.
- Mutation requests enforce JSON content type, a 16 KiB declared body limit, same-origin checks, generic customer errors, and fixed-window rate limits.
- Google credentials and adapters remain server-only.
- Analytics metadata is allowlisted and excludes lead PII.
- Product context must match the exact Product Master product/Reel/campaign tuple.
- Reveal occurs only after the lead provider accepts the inquiry.
- CSP, frame denial, MIME-sniffing, permissions, and referrer headers are set in `next.config.ts`.

The current in-memory rate limiter is appropriate for local Phase 1 validation, not horizontally scaled production. A shared limiter is required before production traffic; see `docs/PHASE_2.md`.
