# Instagram Attribution Funnel Cleanup Design

**Date:** 2026-09-17

## Purpose

Refactor the existing MK Jewels Instagram funnel from a product-reveal and
appointment experience into a simple lead-capture funnel. Product identity is
retained exclusively for attribution, CRM/FMS handoff, reporting, and strict
ManyChat context validation. It is never customer-facing content.

This phase removes obsolete architecture and leaves only a temporary brand
header, neutral introduction, lead form, and post-submission confirmation. It
does not redesign the landing page.

## Customer journey

The active journey is:

1. A customer follows a ManyChat landing URL.
2. The server validates the complete `product_id + reel_id + campaign_id`
   tuple against an active Product_Master row.
3. The customer sees a generic MK Jewels introduction and the existing lead
   fields: full name, mobile number, PIN code, and city.
4. The server validates and durably stores the customer and inquiry.
5. The form is replaced by a semantic success state confirming the configured
   offer and that an MK Jewels representative will contact the customer.

No product name, ID, image, specifications, category, collection, price,
position, or campaign metadata is rendered or returned in the lead response.

## Context resolution

Incoming identifiers remain bounded and validated. A URL is accepted only when
its exact `product_id + reel_id + campaign_id` tuple matches one active mapping.
Changing any member of the tuple must fail safely.

`product_position` is stored for multi-product Reel administration and
reporting. ManyChat resolves a phrase such as "second one" to the canonical
product ID before constructing the landing URL. The application never resolves
a product from a position.

Successful resolution returns an internal `AttributionContext`. It does not
produce a public product contract.

## Canonical Product_Master

The Google Sheets mapping layer is intentionally flat. One row represents one
authoritative Reel/campaign/product attribution tuple.

Canonical columns:

1. `product_id`
2. `product_name`
3. `reel_id`
4. `campaign_id`
5. `product_position`
6. `active_status`
7. `category` (optional reporting field)
8. `collection` (optional reporting field)
9. `campaign_name` (optional reporting field)

The unfinished `Products` plus `Reel_Product_Map` split is not retained. The
runtime join, catalogue cache, image parsing, specifications parsing, and
per-product CTA configuration are removed.

## Customer and inquiry persistence

Customer columns remain:

`customer_id`, `created_at`, `name`, `phone_normalized`, `pin_code`, `city`,
`first_source`

Inquiry columns are:

`inquiry_id`, `customer_id`, `created_at`, `name`, `phone_normalized`,
`pin_code`, `city`, `is_repeat_customer`, `product_id`, `product_name`,
`reel_id`, `campaign_id`, `source`, `utm_source`, `utm_medium`,
`utm_campaign`, `utm_content`, `utm_term`, `session_id`,
`landing_page_version`, `idempotency_key`

`phone_normalized` identifies a customer, not an inquiry. An existing customer
is reused, while each accepted non-replayed interaction creates a new inquiry.
The mapping's `product_name` may be copied into the inquiry for internal
reporting but is not returned to the browser.

The existing idempotency key remains scoped to the session and full context
tuple. A replay returns the original inquiry without creating another row.

## Repository boundary and truthful counts

The repository retains context lookup, lead acceptance, and event recording.
Callback and appointment operations are removed.

It adds a server-only count capability:

```ts
countInquiriesForContext({
  productId,
  reelId?,
  campaignId?,
  since?,
})
```

The implementation counts stored inquiries matching every supplied filter.
Tests cover product-only, product and campaign, exact tuple, and optional time
window queries. This phase adds no public count endpoint and renders no count.

## Post-submission success

Successful lead persistence returns only `inquiryId`, `customerId`, and
`isRepeatCustomer`. The client replaces the form with a dedicated confirmation
component. Its offer and representative-contact wording are public
configuration, not product-row fields.

The `offer_unlocked` event is recorded only after durable acceptance and only
for a non-replayed submission. Failure to record analytics never reverses an
accepted lead.

## Active event model

The allowlisted events are:

- `landing_view`
- `context_resolved`
- `context_failed`
- `form_started`
- `form_validation_failed`
- `form_submitted`
- `repeat_customer_detected`
- `offer_unlocked`

Events carry safe attribution and contain no customer name, phone number, PIN
code, or city. Metadata remains allowlisted.

## Removed functionality

The active funnel and repository remove:

- Product reveal UI, image fallback/loading state, and reveal animation
- Product images, image dimensions/alt text, remote image host configuration,
  and Cloudinary/Vercel Blob product-upload requirements
- Specifications rendering and catalogue-oriented product fields
- Store visit and video consultation UI
- Calendly embed, booking capture route, service, configuration, and CSP hosts
- WhatsApp conversion UI, helper, templates, and configuration
- Callback UI, API, service, repository operation, and active Sheets tab
- Product-level offer expiry and CTA ordering
- Obsolete reveal/conversion events and tests

Historical Google Sheet data is never deleted automatically. The
`Callback_Requests` tab may be archived manually.

## Configuration

The canonical mapping tab is configured with:

`GOOGLE_PRODUCT_SHEET=Product_Master`

Remove:

- `GOOGLE_PRODUCTS_SHEET`
- `GOOGLE_REEL_PRODUCT_MAP_SHEET`
- `GOOGLE_CALLBACK_SHEET`
- `PRODUCT_IMAGE_HOSTS`
- Calendly environment variables
- WhatsApp environment variables

Add optional public presentation configuration:

- `NEXT_PUBLIC_OFFER_UNLOCKED_COPY`
- `NEXT_PUBLIC_REPRESENTATIVE_CONTACT_COPY`
- `NEXT_PUBLIC_BRAND_VIDEO_URL`

The brand video URL is validated and exposed for the next design phase but is
not rendered now. Trust metrics use an empty typed configuration collection;
no metric is rendered until MK Jewels supplies an approved value and label.

## Security and error handling

The refactor preserves:

- Zod validation on server and client-relevant fields
- Indian mobile normalization and PIN validation
- Same-origin, content-type, and body-size guards
- Honeypot and elapsed-time checks
- Distributed Redis rate limiting with local in-memory fallback
- Generic customer-safe failures and PII-safe logs
- Server-only Google credentials
- Header-indexed Google Sheets reads and writes
- Strict production prohibition on the preview repository

Invalid, missing, inactive, or tampered contexts render safe recovery states.
Analytics failures never block or invalidate an accepted lead.

## Testing

Tests prove:

1. A valid tuple loads the lead funnel.
2. Invalid or tampered tuples fail safely.
3. No product data is displayed.
4. A new submission creates a customer and inquiry.
5. A repeat phone reuses the customer and creates another inquiry.
6. Product, Reel, campaign, source, and UTMs are persisted.
7. Idempotent replay creates no duplicate inquiry.
8. Success displays configured offer/contact confirmation.
9. Inquiry counting returns truthful filtered counts.
10. Obsolete catalogue, price, image, specification, appointment, WhatsApp,
    and callback data cannot leak into the client bundle.

Playwright explicitly starts in preview mode so a developer's `.env.local`
cannot silently select live Google Sheets. Final verification includes ESLint,
TypeScript, Vitest, Playwright, production build, dependency audit, secret
scan, client-bundle scan, and `git diff --check`.

## Manual Google Sheets migration

The application performs no external mutations. Operators must:

1. Back up the existing spreadsheet.
2. Create or revise `Product_Master` with the flat canonical headers.
3. Create one row for every valid product/Reel/campaign tuple.
4. Preserve `product_position` for multi-product Reels.
5. Add `product_name` to `Inquiries` if internal reporting needs it.
6. Preserve all historical operational rows.
7. Archive, rather than delete, `Callback_Requests` if no longer needed.
8. Switch the application configuration only after validating the new mapping
   data in a non-production environment.

## Non-goals

- No new visual landing-page design
- No product, offer, trust-metric, video, or inquiry-counter section
- No deployment or external service changes
- No Google Sheets, ManyChat, Instagram, or account mutation
