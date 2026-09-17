# Instagram Attribution Funnel Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the product-reveal funnel with an attribution-only lead funnel backed by one flat Product_Master tab, while preserving secure lead capture, repeat-customer behavior, idempotency, rate limiting, and truthful Google Sheets persistence.

**Architecture:** The server resolves an exact active attribution tuple into an internal mapping record, then passes only attribution identifiers to the interactive lead funnel. Lead submission persists customer and inquiry records and returns identifier-only success data; a dedicated confirmation component renders configurable generic copy. The repository owns flat Product_Master parsing and filtered inquiry counting, while catalogue and post-reveal conversion code is deleted.

**Tech Stack:** Next.js 16.3 App Router, React 19.3, TypeScript 5.9, Zod 4, Google Sheets API, Vitest/Testing Library, Playwright, Upstash Redis rate limiting.

**Spec:** `docs/superpowers/specs/2026-09-17-instagram-attribution-funnel-cleanup-design.md`

## Global Constraints

- Do not redesign the landing page or add marketing, video, trust-metric, or inquiry-counter sections.
- Do not deploy or modify Google Sheets, ManyChat, Instagram, Vercel, or other external services.
- Preserve the exact `product_id + reel_id + campaign_id` authorization tuple and upstream ManyChat position resolution.
- Never return or render product content, price, images, specifications, or catalogue metadata.
- Preserve Zod validation, Indian phone normalization, PIN validation, idempotency, rate limiting, same-origin/body guards, honeypot protection, safe errors, header-indexed Sheets I/O, and PII-free analytics.
- Preserve existing unrelated working-tree changes; the in-scope Redis and route-hardening changes are incorporated.
- Production continues to require Google Sheets; preview remains development/test only.

---

## File structure

- `types/funnel.ts`: attribution, mapping, lead result, and event contracts only.
- `lib/products/contracts.ts`: internal Product_Master record and resolution union.
- `lib/products/resolve-product.ts`: exact-tuple active mapping resolution without public projection.
- `lib/providers/google-sheets-repository.ts`: flat Product_Master parsing, operational writes, and truthful inquiry counts.
- `lib/providers/preview-repository.ts`: deterministic test/dev implementation of the same repository contract.
- `lib/leads/contracts.ts`: persistence port and lead/count result contracts.
- `lib/leads/submit-lead.ts`: durable submission and post-acceptance events.
- `config/experience.ts`: temporary funnel copy, optional video config support, and empty approved trust metrics.
- `components/landing/FunnelExperience.tsx`: pre-submit/success state orchestration.
- `components/landing/SuccessState.tsx`: semantic identifier-free confirmation.
- `components/form/LeadForm.tsx`: unchanged field UX with identifier-only success callback.
- `lib/validation/schemas.ts`: active lead/event/context schemas only.
- `app/instagram/page.tsx`: server context validation and safe funnel rendering.
- `next.config.ts`: security headers without product-image or Calendly allowances.
- `tests/e2e/*.spec.ts` and `playwright.config.ts`: deterministic preview-mode journey and responsive checks.
- `README.md`, `docs/MANYCHAT.md`, `docs/PRODUCT_IMPORT.md`, `docs/PRODUCTION_LAUNCH.md`, `docs/PHASE_2.md`, `.env.example`: attribution-only operation and manual migration.

### Task 1: Replace catalogue contracts with internal attribution mapping

**Files:**
- Modify: `types/funnel.ts`
- Modify: `lib/products/contracts.ts`
- Modify: `lib/products/resolve-product.ts`
- Modify: `lib/products/resolve-product.test.ts`
- Modify: `data/preview-products.ts`

**Interfaces:**
- Produces: `AttributionMapping`, `ResolvedAttributionContext`, and `resolveProductContext(context, repository): Promise<ProductResolution>`.
- `ResolvedAttributionContext` contains `productId`, `reelId`, `campaignId`, `productPosition?`, and internal `productName`; client components receive only the first three through `IncomingInstagramContext`.

- [ ] **Step 1: Replace resolver tests with the attribution-only contract**

```ts
expect(await resolveProductContext(tuple, repository)).toEqual({
  status: "resolved",
  context: {
    productId: "MK001",
    productName: "Internal reporting name",
    reelId: "R101",
    campaignId: "RAKHI26",
    productPosition: 1,
  },
});
expect(JSON.stringify(result)).not.toMatch(/image|specification|price|calendly|whatsapp/i);
```

- [ ] **Step 2: Run the focused resolver test and confirm the old public-product contract fails**

Run: `npm.cmd test -- lib/products/resolve-product.test.ts`

Expected: FAIL because the resolver still returns `product`, image/specification fields, and CTA configuration.

- [ ] **Step 3: Implement minimal attribution-only types, fixtures, and resolver**

```ts
export type AttributionMapping = ProductMapping & {
  productName: string;
  productPosition?: number;
  active: boolean;
  category?: string;
  collection?: string;
  campaignName?: string;
};

export type ProductResolution =
  | { status: "resolved"; context: Omit<AttributionMapping, "active"> }
  | { status: "missing" | "invalid" | "inactive" };
```

- [ ] **Step 4: Run resolver tests**

Run: `npm.cmd test -- lib/products/resolve-product.test.ts`

Expected: PASS.

### Task 2: Flatten Product_Master and add truthful inquiry counts

**Files:**
- Modify: `lib/leads/contracts.ts`
- Modify: `lib/providers/google-sheets-repository.ts`
- Modify: `lib/providers/google-sheets-repository.test.ts`
- Modify: `lib/providers/preview-repository.ts`
- Modify: `lib/config/env.ts`
- Modify: `lib/config/env.test.ts`

**Interfaces:**
- Produces: `countInquiriesForContext(filter: InquiryCountFilter): Promise<number>`.
- Produces: `InquiryCountFilter = { productId: string; reelId?: string; campaignId?: string; since?: string }`.
- Restores `GOOGLE_PRODUCT_SHEET` with default `Product_Master`; removes split catalogue and callback tab configuration.

- [ ] **Step 1: Write failing flat-row and count tests**

```ts
expect(productFromRow({
  product_id: "MK001",
  product_name: "Reporting name",
  reel_id: "R101",
  campaign_id: "RAKHI26",
  product_position: "2",
  active_status: "TRUE",
})).toMatchObject({ productId: "MK001", reelId: "R101", campaignId: "RAKHI26", productPosition: 2 });

await expect(repository.countInquiriesForContext({
  productId: "MK001",
  reelId: "R101",
  campaignId: "RAKHI26",
})).resolves.toBe(2);
```

- [ ] **Step 2: Run provider and environment tests and confirm failure**

Run: `npm.cmd test -- lib/providers/google-sheets-repository.test.ts lib/config/env.test.ts`

Expected: FAIL because the provider still joins two tabs and has no count method.

- [ ] **Step 3: Implement flat headers, parsing, context lookup, counts, and env shape**

```ts
export const defaultHeaders = {
  products: ["product_id", "product_name", "reel_id", "campaign_id", "product_position", "active_status", "category", "collection", "campaign_name"],
  customers: ["customer_id", "created_at", "name", "phone_normalized", "pin_code", "city", "first_source"],
  inquiries: ["inquiry_id", "customer_id", "created_at", "name", "phone_normalized", "pin_code", "city", "is_repeat_customer", "product_id", "product_name", "reel_id", "campaign_id", "source", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "session_id", "landing_page_version", "idempotency_key"],
  events: ["created_at", "event_name", "session_id", "inquiry_id", "customer_id", "product_id", "reel_id", "campaign_id", "source", "landing_page_version", "idempotency_key", "metadata_json"],
} as const;
```

Filter counts by strict equality for every supplied identifier and by parsed `created_at >= since` when a window is supplied. Invalid row dates do not match a `since` filter.

- [ ] **Step 4: Ensure inquiry writes copy the validated internal product name**

Extend the repository acceptance input or service call so the authoritative mapping's `productName`, not a client value, populates `product_name`.

- [ ] **Step 5: Run provider, lead, and env tests**

Run: `npm.cmd test -- lib/providers/google-sheets-repository.test.ts lib/leads/submit-lead.test.ts lib/config/env.test.ts`

Expected: PASS.

### Task 3: Replace reveal success with identifier-only confirmation and active events

**Files:**
- Modify: `lib/validation/schemas.ts`
- Modify: `lib/validation/schemas.test.ts`
- Modify: `lib/leads/submit-lead.ts`
- Modify: `lib/leads/submit-lead.test.ts`
- Modify: `lib/analytics/record-event.ts`
- Modify: `lib/analytics/record-event.test.ts`
- Modify: `lib/attribution/client-events.ts`
- Modify: `config/experience.ts`
- Modify: `components/form/LeadForm.tsx`
- Modify: `components/form/LeadForm.test.tsx`
- Modify: `components/landing/FunnelExperience.tsx`
- Create: `components/landing/SuccessState.tsx`
- Create: `components/landing/SuccessState.test.tsx`
- Modify: `app/api/lead/route.ts`
- Modify: `app/api/lead/route.test.ts`
- Modify: `app/instagram/page.tsx`

**Interfaces:**
- Lead success: `{ ok: true; inquiryId: string; customerId: string; isRepeatCustomer: boolean }`.
- `SuccessState` consumes only repeat status and configured public copy.
- Event allowlist: `landing_view`, `context_resolved`, `context_failed`, `form_started`, `form_validation_failed`, `form_submitted`, `repeat_customer_detected`, `offer_unlocked`.

- [ ] **Step 1: Write failing service, API, and component tests**

```ts
expect(result).toEqual({
  ok: true,
  inquiryId: "inq_1",
  customerId: "cus_1",
  isRepeatCustomer: false,
});
expect(result).not.toHaveProperty("product");
expect(screen.getByRole("heading", { name: /offer has been unlocked/i })).toBeVisible();
expect(screen.queryByText(/MK001|Reporting name|specification|price/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run focused tests and confirm the reveal contract fails**

Run: `npm.cmd test -- lib/leads/submit-lead.test.ts app/api/lead/route.test.ts components/form/LeadForm.test.tsx components/landing/SuccessState.test.tsx`

Expected: FAIL because lead success still returns a public product and renders `ProductReveal`.

- [ ] **Step 3: Implement identifier-only success and configurable copy**

```ts
export const experienceCopy = {
  heading: "Share your details with MK Jewels",
  introduction: "Tell us how to reach you about the piece you enquired about.",
  submit: "Unlock my offer",
  offerUnlocked: process.env.NEXT_PUBLIC_OFFER_UNLOCKED_COPY || "Your promotional offer has been unlocked.",
  representativeContact: process.env.NEXT_PUBLIC_REPRESENTATIVE_CONTACT_COPY || "An MK Jewels representative will contact you shortly regarding your enquiry.",
};
```

Validate `NEXT_PUBLIC_BRAND_VIDEO_URL` as an optional HTTPS URL in public configuration, but do not render it. Export `approvedTrustMetrics` as an empty readonly collection.

- [ ] **Step 4: Rename and restrict active events**

Replace `product_context_resolved`/`product_context_failed` with
`context_resolved`/`context_failed`; record `offer_unlocked` after a new accepted
lead. Keep analytics best-effort and metadata allowlisted.

- [ ] **Step 5: Run service, API, validation, analytics, and component tests**

Run: `npm.cmd test -- lib/leads/submit-lead.test.ts app/api/lead/route.test.ts lib/validation/schemas.test.ts lib/analytics/record-event.test.ts components/form/LeadForm.test.tsx components/landing/SuccessState.test.tsx`

Expected: PASS.

### Task 4: Delete reveal and conversion architecture

**Files:**
- Delete: `components/product/ProductReveal.tsx`
- Delete: `components/product/ProductReveal.test.tsx`
- Delete: `components/scheduling/AppointmentChooser.tsx`
- Delete: `components/scheduling/CalendlyEmbed.tsx`
- Delete: `components/conversion/SecondaryActions.tsx`
- Delete: `app/api/appointment/route.ts`
- Delete: `app/api/callback/route.ts`
- Delete: `lib/appointments/record-booking.ts`
- Delete: `lib/appointments/record-booking.test.ts`
- Delete: `lib/callbacks/request-callback.ts`
- Delete: `lib/callbacks/request-callback.test.ts`
- Delete: `lib/conversion/whatsapp.ts`
- Delete: `lib/conversion/whatsapp.test.ts`
- Delete: `lib/campaign/offer.ts`
- Delete: `lib/campaign/offer.test.ts`
- Modify: `lib/http/route.ts`
- Modify: `lib/http/route.test.ts`
- Modify: `next.config.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Mutation rate-limit buckets remain `lead` and `events` only.
- CSP retains the restrictive self-only policy and removes Calendly hosts.

- [ ] **Step 1: Search the active graph before deletion**

Run: `rg -n "ProductReveal|Appointment|Calendly|callback|whatsapp|offerExpires|productImage|specifications|PRODUCT_IMAGE_HOSTS" app components config lib types next.config.ts`

Expected: only files named above plus references being removed in Tasks 1-3.

- [ ] **Step 2: Delete obsolete files and remove imports, route buckets, and CSS selectors**

Use explicit named-path patches. Do not delete brand assets or historical design/spec documents.

- [ ] **Step 3: Simplify security headers**

```ts
const policy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
  "img-src 'self' data:",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
].join("; ");
```

- [ ] **Step 4: Run lint, TypeScript, and all unit tests**

Run: `npm.cmd run lint && npm.cmd run typecheck && npm.cmd test`

Expected: PASS with no imports or tests for removed functionality.

### Task 5: Rewrite browser coverage and isolate preview mode

**Files:**
- Modify: `playwright.config.ts`
- Modify: `tests/e2e/funnel.spec.ts`
- Modify: `tests/e2e/overflow.spec.ts`

**Interfaces:**
- Playwright web server explicitly receives `DATA_PROVIDER=preview` and safe blank integration overrides.
- Browser tests assert confirmation and absence of product leakage.

- [ ] **Step 1: Rewrite E2E expectations for the temporary funnel**

```ts
await expect(page.getByRole("heading", { name: "Share your details with MK Jewels" })).toBeVisible();
await submitLead(page, "9876543210");
await expect(page.getByRole("heading", { name: /offer has been unlocked/i })).toBeVisible();
await expect(page.getByText(/MKBR639|Gold Open-Back|Purity|Store Visit|WhatsApp/i)).toHaveCount(0);
```

Keep missing, inactive, tampered tuple, invalid source, invalid form, repeat-customer, and 320px-1440px overflow coverage.

- [ ] **Step 2: Make the web server deterministic**

Use a PowerShell-compatible command that sets `DATA_PROVIDER=preview` for the spawned Next.js dev process and does not inherit live Sheets selection. Set `reuseExistingServer: false` so a live local server cannot contaminate the suite.

- [ ] **Step 3: Run Playwright**

Run: `npm.cmd run test:e2e`

Expected: all funnel and overflow cases PASS with one worker.

### Task 6: Rewrite operational documentation and migration artifacts

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/MANYCHAT.md`
- Modify: `docs/PRODUCT_IMPORT.md`
- Modify: `docs/PRODUCTION_LAUNCH.md`
- Modify: `docs/PHASE_2.md`
- Modify: `docs/product-master-template.csv`

**Interfaces:**
- Documents expose one `Product_Master` tab and the unchanged ManyChat URL contract.
- Migration instructions preserve existing data and archive callbacks rather than deleting them.

- [ ] **Step 1: Replace the product template with the flat headers and safe sample mapping rows**

```csv
product_id,product_name,reel_id,campaign_id,product_position,active_status,category,collection,campaign_name
MK001,Internal reporting name,R101,RAKHI26,1,TRUE,Bracelet,Rakhi 2026,Rakhi Offer 2026
```

- [ ] **Step 2: Rewrite README, ManyChat, import, launch, and Phase 2 documentation**

State verbatim: "The Product ID is attribution data, not customer-facing product content."

Document the single-product and resolved multi-product URLs, manual Sheet
migration, active events, remaining environment variables, preview/production
boundary, and the fact that video/trust/count UI is not implemented.

- [ ] **Step 3: Remove obsolete environment examples**

Keep runtime, Google credentials and tab names, public success/video config,
Upstash, and optional assisted support. Remove split tabs, callbacks, imagery,
Calendly, and WhatsApp configuration.

- [ ] **Step 4: Scan documentation for obsolete active guidance**

Run: `rg -n -i "Products|Reel_Product_Map|ProductReveal|image_url|specifications_json|PRODUCT_IMAGE_HOSTS|Calendly|WhatsApp|Callback_Requests" README.md .env.example docs/MANYCHAT.md docs/PRODUCT_IMPORT.md docs/PRODUCTION_LAUNCH.md docs/PHASE_2.md docs/product-master-template.csv`

Expected: no active instructions requiring removed functionality; migration history may mention archiving `Callback_Requests` once.

### Task 7: Complete final verification and scoped commit

**Files:**
- Verify all modified/deleted paths

- [ ] **Step 1: Run static and unit verification**

Run: `npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`

Expected: all commands PASS.

- [ ] **Step 2: Run browser and production verification**

Run: `npm.cmd run test:e2e; npm.cmd run build`

Expected: all Playwright cases and the Next.js production build PASS.

- [ ] **Step 3: Run dependency and source safety checks**

Run: `npm.cmd audit --omit=dev`

Expected: zero known production vulnerabilities.

Run targeted `rg` scans over source and `.next/static` for Google secrets,
private keys, product display fields, prices, image hosts, specifications,
Calendly, WhatsApp, and callbacks. Any occurrence must be either absent or an
explicit negative assertion/documented migration note, never active client code.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check`, `git status --short`, and `git diff --stat`.

Confirm only the approved refactor and the incorporated in-scope hardening
changes are present. Do not push or deploy.

- [ ] **Step 5: Commit the implementation**

Stage only named in-scope paths and commit with:

```text
refactor: simplify Instagram funnel to attribution-only leads
```
