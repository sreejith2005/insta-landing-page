# MK Jewels Instagram Lead Funnel Design

**Date:** 2026-09-15

**Status:** Approved and implemented

**Source of truth:** `MK_Jewels_Instagram_Lead_Funnel_PRD.docx`

## Objective

Build one production-oriented, mobile-first MK Jewels application that receives validated Instagram campaign, Reel, and canonical product context; captures Full Name, Mobile Number, PIN Code, and City; durably records an attributable inquiry; reveals the approved product without price; and prioritizes store-visit or video-consultation booking. WhatsApp and callback are secondary actions.

Phase 1 establishes the complete application architecture and customer-facing experience. It includes real server-side integration seams and a clearly marked non-production preview provider, but it does not claim a production Google Sheets, Calendly, ManyChat, WhatsApp, or FMS integration without the required business inputs.

## Product Boundaries

- Use one `/instagram` application route for every product and campaign. Never create product-specific page source.
- Accept `product`, `reel`, and `campaign` query parameters for the MVP contract. Keep context resolution behind an interface so a signed opaque token can replace or supplement them later.
- Treat ManyChat as the upstream owner of natural-language and product-position resolution for multi-product Reels. The landing page consumes a canonical product ID and does not perform Instagram NLP.
- Never display price in Phase 1 or include it in the public product response type.
- Never generate, alter, or substitute jewellery product imagery. Only an approved image from the resolved product record may appear. A missing image produces a polished unavailable-image state.
- Do not fabricate scarcity, countdowns, viewer counts, stock levels, testimonials, or urgency. Offer copy and genuine expiry data are configuration values.
- Do not add ecommerce, a general website CTA, Instagram scraping, final marketing-consent behavior, or FMS reconstruction.

## Architecture

Use a single Next.js App Router application with TypeScript and server route handlers. Zod schemas define the external and internal contracts. The customer UI depends on safe public view models rather than directly on Google Sheets or provider-specific records.

The architecture has five boundaries:

1. **Experience layer:** Server-rendered route shell plus focused client components for form interaction, reveal transition, appointment selection, and callback state.
2. **Context and domain layer:** Validates incoming identifiers, resolves product/campaign data, normalizes Indian phone numbers, creates customer/inquiry identities, and enforces reveal policy.
3. **Application services:** Orchestrates lead acceptance, repeat detection, idempotency, event recording, and callback requests through typed repository ports.
4. **Provider adapters:** Google Sheets is the production staging provider. A file-backed, clearly labeled preview provider exists only outside production for local UI development and automated tests.
5. **Platform layer:** Environment validation, safe logging, security headers, request limits, rate limiting, and third-party embed loading.

Provider selection is server-only. Production startup or requests fail safely if the configured durable provider is unavailable. The browser never receives Google credentials, writable sheet identifiers unless explicitly safe, raw provider errors, or server configuration secrets.

## Proposed File Structure

```text
app/
  api/
    callback/route.ts
    events/route.ts
    lead/route.ts
  instagram/
    loading.tsx
    page.tsx
  globals.css
  layout.tsx
components/
  brand/
  form/
  landing/
  product/
  scheduling/
config/
  experience.ts
data/
  preview-products.ts
lib/
  analytics/
  attribution/
  config/
  google-sheets/
  leads/
  phone/
  products/
  rate-limit/
  validation/
public/
  brand/
  products/
tests/
types/
docs/
```

Files remain focused by responsibility. Feature components live with their immediate UI concerns; provider code does not leak into components; shared external contracts live in `types`; and runtime configuration lives in validated server/client modules.

## Runtime Modes

### Production Google Sheets mode

`DATA_PROVIDER=google-sheets` is the only intended production provider. Server-side adapters read public product/campaign configuration and perform idempotent customer, inquiry, event, and callback writes using least-privilege credentials. A lead is successful only after the configured durable write policy succeeds. Product reveal occurs only after that response.

### Local preview mode

`DATA_PROVIDER=preview` is allowed only when `NODE_ENV !== "production"`. It uses explicitly named sample configuration and a durable local test repository where practical. The UI displays a development-only preview marker. Preview records and responses are never described as production integrations. The production build rejects preview-provider activation.

### Unconfigured mode

Missing required provider configuration returns customer-safe service-unavailable states and server-side diagnostic logs without PII. It never simulates a successful submission.

## Data Contracts

### Incoming context

```ts
type IncomingInstagramContext = {
  productId: string;
  reelId: string;
  campaignId: string;
  contextToken?: string;
};
```

Identifiers are trimmed, length-limited, character-restricted, and resolved against the configured Product Master. The triple must represent an active approved mapping. Editing one query parameter cannot resolve an unrelated product in the same provider dataset.

### Public product context

```ts
type PublicProductContext = {
  productId: string;
  productName: string;
  productImage: { src: string; alt: string; width: number; height: number } | null;
  specifications: Array<{ label: string; value: string }>;
  campaign: { campaignId: string; offerCopy?: string; offerExpiresAt?: string };
  calendly: {
    storeVisitUrl?: string;
    videoConsultationUrl?: string;
  };
  ctas: {
    whatsappEnabled: boolean;
    callbackEnabled: boolean;
    order: Array<"store_visit" | "video_consultation" | "whatsapp" | "callback">;
  };
};
```

There is deliberately no price property. Specification rows and CTA order are flexible arrays so jewellery category changes do not require a UI rewrite.

### Lead submission

The client submits the four fields, validated context, anonymous session ID, landing-page version, and an idempotency key. The server validates again, normalizes Indian mobile input to a consistent canonical form, and validates a six-digit PIN. It stores the minimum necessary values and does not persist raw phone input unless a future approved requirement demands it.

The service resolves or creates one logical customer by normalized phone while always creating a distinct inquiry. Repeat status is a response attribute, not a uniqueness restriction on inquiries.

### Sheets model

- `Product_Master`: approved product, Reel/campaign mapping, specifications, active status, reveal flags, offer, Calendly, and CTA configuration.
- `Customers`: one logical customer per normalized phone.
- `Inquiries`: one row per accepted submission, including repeat inquiries and attribution.
- `Events`: minimum event metadata needed for funnel analysis.
- `Callback_Requests`: an operational callback queue linked to inquiry/customer/context.

The Sheets adapter exposes repository methods; the application service does not depend on sheet names, column positions, or Google APIs.

## Customer Experience

### Visual system

The page uses a restrained editorial luxury direction based on the official MK Jewels website's image-first merchandising and premium brand tone: true white and a controlled warm-neutral surface, deep burgundy for primary actions, muted gold for small rules or selected-state detail, charcoal text, fine borders, minimal shadow, generous whitespace, and deliberate typography. Exact logo, brand color, and font values remain replaceable tokens until approved assets or a formal brand guide are supplied.

No AI-generated jewellery appears in concepts or production. Before implementation, a visual concept may use neutral image frames to specify crop, spacing, and hierarchy. Approved product assets replace those frames through the product record.

### Pre-submission state

- A quiet brand header with an approved repository logo when available; otherwise an accessible text wordmark clearly marked for replacement in development.
- A continuity message that the visitor is one step from viewing the piece selected on Instagram.
- Configured offer copy only when present and valid.
- A subtle product teaser that does not expose an unapproved product image or make unsupported claims.
- A compact semantic progress cue: `Details → Your Piece → Private Appointment`.
- Four visible, properly labeled fields with suitable `autocomplete` and `inputMode` values.
- A premium primary CTA such as `Unlock my selected piece`, sourced from experience configuration.
- Minimal privacy/trust microcopy that does not invent a finalized consent policy.

### Reveal state

After a durable lead response, the form region transitions into the exact approved product image, product identity, flexible specifications, and verified campaign message. The transition is restrained and disabled or simplified for reduced-motion users. Focus moves to a reveal heading and a live-region message confirms success.

### Appointment state

Store Visit and Video Consultation are the visually dominant choices. Selecting one records an attributable event and loads its configured Calendly experience on demand to avoid initial bundle/network cost. The embed is contained within a width-safe responsive frame; a loading skeleton reserves space; and a configured external scheduling link appears if the embed is unavailable.

WhatsApp and Request a Callback follow as secondary actions. WhatsApp opens a configurable destination with only a non-sensitive inquiry/product reference. Callback remains in-page, posts against the accepted inquiry, protects against repeat activation, and shows a confirmation state.

## Application States

- **Loading:** Stable server-route skeleton with reserved form/media geometry.
- **Invalid context:** Explain that the selection link cannot be verified and offer configured assisted support.
- **Missing product:** Do not infer or substitute a product; provide recovery.
- **Inactive product:** Say the selected piece is currently unavailable and provide recovery.
- **Missing product image:** Preserve product identity/specifications if policy allows, show an elegant image-unavailable panel, and never use a fabricated replacement.
- **Network failure:** Preserve entered values and offer a retry without exposing technical details.
- **Submission failure:** Associate accessible feedback with the form and do not reveal the product.
- **Submission success:** Announce acceptance, reveal the product, and expose conversion actions.
- **Calendly unavailable:** Offer the configured direct scheduling link; if absent, retain WhatsApp/callback recovery.
- **Callback success/failure:** Keep the visitor on the reveal and give an accessible status message.

## Validation and Security

- Client validation improves UX; Zod server schemas are authoritative.
- Full Name and City are trimmed, normalized for whitespace, length-limited, and treated as text. Output is rendered through React without raw HTML.
- Indian mobile numbers accept reasonable formatting and an optional `+91`/`91` prefix, then normalize to ten digits only when the number begins with an allowed Indian mobile prefix.
- PIN code is exactly six digits and begins with a non-zero digit.
- Every mutation checks content type, body size, schema, context validity, and an endpoint-specific rate limit.
- Lead creation requires an idempotency key scoped to the session/context/submission. Replays return the original accepted result and do not create a second inquiry.
- Callback requests require a valid accepted inquiry reference. Event metadata uses an allowlist and strict size bounds.
- Security headers include a restrictive content security policy that permits only configured Calendly hosts, plus clickjacking, MIME sniffing, referrer, and permissions protections.
- Logs use generated request/inquiry identifiers and redacted structured fields. They never print names, normalized phone numbers, PIN codes, credential material, complete request bodies, or provider payloads.
- Google credentials remain server-only, support newline-safe private-key loading, and use least-privilege Sheet access.
- CORS remains same-origin unless an explicit approved origin list is configured.
- Rate limiting is implemented behind a store interface. The in-memory implementation is development/test only; production requires a shared durable limiter or fails closed for mutation endpoints.

## Performance and Responsiveness

- Server-render the initial context and HTML. Hydrate only form and post-submit interaction islands.
- Load Calendly only after reveal and appointment selection. Defer analytics delivery and batch low-priority events where safe.
- Use `next/image` with explicit dimensions, responsive `sizes`, correct priority only for genuinely above-the-fold approved media, and lazy loading elsewhere.
- Reserve image and embed geometry to prevent layout shift.
- Support 320 px and wider layouts, portrait and landscape phones, tablets, and desktop. CSS uses fluid type/space tokens, min/max sizing, wrapping grids, and no fixed content widths that can overflow.
- Apply safe-area padding with `env(safe-area-inset-*)` without disabling zoom.
- All controls have approximately 44 by 44 CSS-pixel interactive targets.
- Landscape layouts shorten nonessential vertical spacing while keeping the CTA and Calendly fallback reachable.
- `prefers-reduced-motion` removes nonessential movement; `prefers-reduced-data` avoids eager third-party loading where supported.

## Accessibility

- Use landmarks, one descriptive `h1`, ordered headings, native form controls, buttons for actions, and links only for navigation.
- Every field has a persistent label, description/error association, visible focus ring, and accessible invalid state.
- Validation summary and field errors are announced without stealing focus on every keystroke.
- Reveal and callback success use polite live regions and deliberate focus management.
- Progress semantics include text, not color alone.
- Product image alt text describes the approved product identity without marketing embellishment.
- All content and controls remain usable by keyboard, at 200% text zoom, and with reduced motion.

## Event and Attribution Model

The session starts with a random opaque client identifier stored in first-party session storage. Events use the PRD names: `landing_view`, `product_context_resolved`, `product_context_failed`, `form_started`, `form_validation_failed`, `form_submitted`, `repeat_customer_detected`, `product_revealed`, `calendly_opened`, `store_visit_selected`, `video_consultation_selected`, `appointment_booked`, `whatsapp_clicked`, and `callback_requested`.

Every event contains timestamp, session ID, landing-page version, source (`instagram`), and validated product/Reel/campaign context. Inquiry/customer identifiers appear only after lead acceptance. Extra metadata is event-specific and allowlisted. PII is excluded from analytics events.

`appointment_booked` remains disabled until a reliable Calendly callback can be verified and associated with the active inquiry.

## Testing Strategy

### Unit tests

- Context schemas and mapping validation.
- Indian phone normalization and rejection cases.
- PIN, name, and city validation.
- Public product projection proves price cannot leak.
- CTA/reveal policy and flexible specification rendering.
- Idempotency and repeat-customer behavior using repository fakes confined to tests.

### Route/service tests

- Valid, missing, mismatched, and inactive product context.
- Successful and failed durable lead writes.
- New and repeat customer inquiries.
- Double-submit replay.
- Invalid content type, oversized bodies, schema errors, rate limiting, and sanitized error responses.
- Callback linkage and event metadata allowlisting.
- Production refusal of the preview provider and in-memory limiter.

### Component and accessibility tests

- Empty and malformed form states, focus/error association, loading, double-submit protection, success reveal, missing image, Calendly fallback, callback confirmation, and no price text.

### Browser tests

- Core valid-context journey in explicit preview mode.
- Invalid, missing, and inactive context recovery.
- Slow/failing lead request retains input and withholds reveal.
- WhatsApp, callback, store visit, video consultation, and Calendly fallback behavior.
- Keyboard flow and automated accessibility checks.
- Overflow and critical-content screenshots at 320x568, 360x800, 390x844, 412x915, representative mobile landscape, tablet, and desktop.

Browser verification must use the approved design concept as the visual reference. It includes concept-to-render comparison, above-the-fold copy diff, safe-area/overflow checks, and direct image inspection before completion is claimed.

## Environment Variables

The precise names will be documented in `.env.example`; the intended groups are:

- Application: public base URL, landing-page version, provider mode, assisted-support fallback.
- Google Sheets: service-account email, private key, spreadsheet ID, and sheet/tab names if they differ from defaults.
- Calendly: optional global store/video URLs and allowed embed origin, overridable by approved campaign data.
- WhatsApp: destination number and approved message template/reference behavior.
- Security: rate-limit provider credentials/configuration and optional signed-context verification secret for Phase 2.
- Feature flags: events, callback, Calendly embed, opaque-context validation, and development preview marker.

Only variables intentionally prefixed for the browser may enter the client bundle. Secrets and writable integration identifiers remain server-only.

## Required Production Inputs and Phase 2

The following are not present in the repository and block a truthful production launch, but not Phase 1 architecture/frontend implementation:

- Approved MK Jewels logo, fonts/brand guide, and product imagery.
- A real Product Master row and Reel/product/campaign mapping.
- Final Calendly store and video event URLs plus booking-event contract.
- Approved WhatsApp destination and message wording.
- Google Sheet ID, service account, tab structure, and least-privilege access.
- Final offer eligibility/expiry language and privacy/consent copy.

Phase 2 connects and verifies ManyChat signed context, production Google Sheets, durable distributed rate limiting, Calendly booking callbacks, approved WhatsApp/callback operations, downstream FMS handoff, consent design, and live authenticated device/browser QA. Phase 1 will not simulate those integrations as completed.

## Definition of Done for Phase 1

- One Next.js application renders all valid configured products at `/instagram`.
- Incoming context is validated against an approved mapping boundary.
- The four-field form is responsive, accessible, configuration-driven, and authoritatively validated server-side.
- Lead orchestration supports durable Google Sheets writes, customer deduplication, distinct inquiries, idempotency, safe failures, and a non-production preview mode.
- Reveal is gated by accepted lead persistence and never contains price.
- Approved product imagery/specifications, when configured, render responsively; missing media does not trigger substitution.
- Store/video scheduling, WhatsApp, and callback components are configuration-driven and attributable.
- All PRD failure states have polished customer-safe UI.
- Type checking, linting, unit/integration/component tests, production build, security checks, and the required viewport/browser matrix pass to the extent supported locally.
- README and `.env.example` distinguish local preview, production configuration, verified behavior, and Phase 2 work.
