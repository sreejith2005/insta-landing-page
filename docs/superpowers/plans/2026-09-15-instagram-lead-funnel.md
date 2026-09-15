# MK Jewels Instagram Lead Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Phase 1 mobile-first MK Jewels Instagram lead funnel as one secure, configuration-driven Next.js application with a truthful local preview mode and production Google Sheets integration boundary.

**Architecture:** A Next.js App Router application server-renders validated campaign/product context and hydrates focused client components for the lead and conversion flow. Domain services depend on typed repositories; preview and Google Sheets adapters remain server-only, reveal requires an accepted inquiry, and all public contracts omit price.

**Tech Stack:** Next.js, React, TypeScript, Zod, Vitest, Testing Library, Playwright, ESLint, Google APIs client, CSS Modules/global design tokens.

**Spec:** `docs/superpowers/specs/2026-09-15-instagram-lead-funnel-design.md`

## Global Constraints

- One reusable `/instagram` route; never create product-specific page source.
- Initial fields are Full Name, Mobile Number, PIN Code, and City only.
- Never expose price, secrets, raw provider failures, or unnecessary PII.
- Never generate or alter jewellery imagery; approved product records are the only image source.
- Production must reject preview storage and must not simulate durable success.
- Mobile-first from 320 px, safe-area aware, zoom enabled, approximately 44 px touch targets, reduced-motion support, and no horizontal overflow.
- Store Visit and Video Consultation are primary; WhatsApp and Callback are secondary; no Visit Website CTA.
- Follow test-first red-green-refactor for domain, service, route, and component behavior.
- Use `npm.cmd`/`npx.cmd` on Windows.

---

### Task 1: Scaffold the application and validated configuration

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`
- Create: `.gitignore`, `.env.example`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Create: `lib/config/env.ts`, `lib/config/env.test.ts`, `types/funnel.ts`

**Interfaces:**
- Produces `serverEnv()` and `publicEnv()` validated configuration accessors.
- Produces shared identifiers, context, product, lead, event, callback, and API-result types.

- [ ] Write `lib/config/env.test.ts` first to require Google credentials in production Google mode, reject preview mode in production, and allow preview mode in tests.
- [ ] Run `npm.cmd test -- lib/config/env.test.ts` and confirm failure because `env.ts` does not exist.
- [ ] Scaffold Next.js/TypeScript/testing configuration and implement Zod environment parsing with server/client separation.
- [ ] Run the focused test, lint, and typecheck; confirm all pass.
- [ ] Commit the named scaffold/configuration paths.

### Task 2: Implement domain validation and safe product resolution

**Files:**
- Create: `lib/validation/schemas.ts`, `lib/validation/schemas.test.ts`
- Create: `lib/phone/normalize-indian-phone.ts`, `lib/phone/normalize-indian-phone.test.ts`
- Create: `lib/products/contracts.ts`, `lib/products/resolve-product.ts`, `lib/products/resolve-product.test.ts`
- Create: `data/preview-products.ts`

**Interfaces:**
- Consumes shared funnel types and `serverEnv()`.
- Produces `normalizeIndianPhone(input): string`, `leadSubmissionSchema`, `eventSchema`, `callbackSchema`, `resolveProductContext(context, repository)`, and `ProductRepository`.

- [ ] Write failing phone tests covering spaces/dashes, `+91`, invalid prefixes, repeated digits, and wrong lengths; run and observe the missing-module failure.
- [ ] Implement normalization minimally; rerun and pass.
- [ ] Write failing schema tests for four required fields, non-zero six-digit PIN, bounded text, identifiers, idempotency key, and metadata allowlists; run and observe failure.
- [ ] Implement schemas; rerun and pass.
- [ ] Write failing resolver tests for valid mapping, parameter tampering, missing, inactive, and missing-image contexts, plus a type-level/public-projection assertion that price is absent.
- [ ] Implement repository contract, explicit preview products, and safe projection; rerun and pass.
- [ ] Run all tests/typecheck and commit named paths.

### Task 3: Implement durable lead, event, and callback services

**Files:**
- Create: `lib/leads/contracts.ts`, `lib/leads/submit-lead.ts`, `lib/leads/submit-lead.test.ts`
- Create: `lib/analytics/record-event.ts`, `lib/analytics/record-event.test.ts`
- Create: `lib/callbacks/request-callback.ts`, `lib/callbacks/request-callback.test.ts`
- Create: `lib/providers/preview-repository.ts`, `lib/providers/google-sheets-repository.ts`, `lib/providers/repository.ts`

**Interfaces:**
- Produces a `FunnelRepository` with context reads and idempotent `acceptLead`, `recordEvent`, and `requestCallback` mutations.
- Produces `submitLead`, `recordEvent`, and `requestCallback` application services returning discriminated customer-safe results.

- [ ] Write failing service tests proving one customer per normalized phone, a new inquiry for every non-replayed submission, idempotent replay, durable-write failure withholding reveal, and no PII in errors.
- [ ] Run focused tests and confirm expected missing behavior.
- [ ] Implement domain services and a test/development preview repository with persistence scoped to the process and explicit preview semantics; rerun and pass.
- [ ] Write failing event/callback tests proving metadata allowlisting, existing-inquiry linkage, and repeat callback idempotency.
- [ ] Implement event/callback services; rerun and pass.
- [ ] Implement the Google Sheets adapter with configurable tab names, header-based rows, server-only credentials, append/update operations, and idempotency lookup. Unit-test its row mapping without live credentials.
- [ ] Run all tests/typecheck and commit named paths.

### Task 4: Add secure route handlers and platform protections

**Files:**
- Create: `app/api/lead/route.ts`, `app/api/events/route.ts`, `app/api/callback/route.ts`
- Create: `lib/http/route.ts`, `lib/http/route.test.ts`
- Create: `lib/rate-limit/contracts.ts`, `lib/rate-limit/memory.ts`, `lib/rate-limit/rate-limit.test.ts`
- Create: `proxy.ts`, `next.config.ts` updates

**Interfaces:**
- Consumes application services and repository factory.
- Produces same-origin JSON mutation endpoints with body limits, schema errors, rate limits, generic failures, request identifiers, CSP, and security headers.

- [ ] Write failing HTTP helper tests for JSON content type, body-size limit, malformed JSON, same-origin enforcement, customer-safe error mapping, and request IDs.
- [ ] Implement helpers and run focused tests green.
- [ ] Write failing rate-limit tests for endpoint/session/IP keys and production refusal of memory storage.
- [ ] Implement the limiter interface and preview memory store; run tests green.
- [ ] Write route tests for 201/400/409/415/429/503 behavior, idempotency, reveal payload gating, callback linkage, and safe event acceptance.
- [ ] Implement route handlers and security headers/CSP; run tests green.
- [ ] Run lint, typecheck, tests, and dependency audit; commit named paths.

### Task 5: Create and implement the approved visual system and lead flow

**Files:**
- Create: `docs/design/instagram-funnel-concept.png`
- Create: `app/instagram/page.tsx`, `app/instagram/loading.tsx`, `app/instagram/not-found.tsx`
- Create: `components/brand/BrandHeader.tsx`, `components/landing/Progress.tsx`, `components/landing/FunnelExperience.tsx`
- Create: `components/form/LeadForm.tsx`, `components/form/LeadField.tsx`, `components/form/LeadForm.test.tsx`
- Create: `components/product/ProductReveal.tsx`, `components/product/ProductReveal.test.tsx`
- Create: `components/landing/ContextState.tsx`, `config/experience.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes safe `PublicProductContext` and `/api/lead`.
- Produces the complete pre-submission flow and durable-success-gated reveal.

- [ ] Generate a full mobile/desktop visual concept with neutral image frames only, inspect it, and extract exact design tokens/copy/component geometry.
- [ ] Write failing component tests for visible labels, input modes/autocomplete, inline errors, double-submit protection, retained values after failure, focus/live announcements, durable-success reveal, no price, and missing-image fallback.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement server context loading, all context states, configuration-driven form fields, accessible submission behavior, reveal focus management, and exact concept tokens.
- [ ] Rerun focused tests, lint, and typecheck; commit named paths.

### Task 6: Implement conversion actions and deferred integrations

**Files:**
- Create: `components/scheduling/AppointmentChooser.tsx`, `components/scheduling/CalendlyEmbed.tsx`, `components/scheduling/AppointmentChooser.test.tsx`
- Create: `components/conversion/SecondaryActions.tsx`, `components/conversion/SecondaryActions.test.tsx`
- Create: `lib/attribution/session.ts`, `lib/attribution/client-events.ts`, `lib/attribution/client-events.test.ts`
- Modify: `components/landing/FunnelExperience.tsx`, `app/globals.css`

**Interfaces:**
- Consumes accepted inquiry/public context and event/callback endpoints.
- Produces store/video selection, lazy Calendly loading/fallback, attributable WhatsApp link, callback request, and session/event handling.

- [ ] Write failing tests for primary CTA priority, configured order/visibility, lazy Calendly load, fallback link, safe WhatsApp reference, callback in-place success/failure, and session ID stability.
- [ ] Run tests and confirm expected failure.
- [ ] Implement components and attribution helpers, dynamically loading Calendly only after selection.
- [ ] Rerun focused tests and full checks; commit named paths.

### Task 7: Complete documentation and automated browser coverage

**Files:**
- Create: `README.md`, `docs/PHASE_2.md`
- Create: `tests/e2e/funnel.spec.ts`, `tests/e2e/overflow.spec.ts`
- Modify: `.env.example`, `package.json`, `.gitignore`

**Interfaces:**
- Documents and verifies the complete Phase 1 operating contract.

- [ ] Write browser tests for valid preview flow, invalid/missing/inactive context, API failure withholding reveal, callback, scheduling fallback, and absence of price/website CTA.
- [ ] Add overflow/screenshot assertions for 320x568, 360x800, 390x844, 412x915, mobile landscape, tablet, and desktop.
- [ ] Run browser tests and observe expected failures before final UI/responsive fixes.
- [ ] Implement only fixes demonstrated by those failures; rerun until green.
- [ ] Document setup, runtime modes, environment variables, Google Sheet schema, production input blockers, deployment/security notes, and Phase 2 scope.
- [ ] Run lint, typecheck, unit/component tests, production build, dependency audit, and browser tests; commit named paths.

### Task 8: Final visual, accessibility, security, and repository verification

**Files:**
- Modify only files implicated by verification failures.
- Remove temporary QA artifacts while retaining the approved concept.

**Interfaces:**
- Produces final evidence and a clean, reviewable repository.

- [ ] Run the app and inspect the core journey in the in-app Browser; use Playwright only if the Browser surface is unavailable.
- [ ] Capture the implementation at the concept's native mobile and desktop dimensions.
- [ ] Inspect concept and implementation screenshots directly; write a five-point fidelity ledger and fix every material mismatch.
- [ ] Verify keyboard traversal, visible focus, 200% zoom behavior, reduced motion, safe areas, narrow Calendly containment, and no horizontal scrolling.
- [ ] Search source/build output for secrets, price leakage, raw PII logging, unsafe HTML, fake success behavior, and unapproved CTAs.
- [ ] Run fresh final commands: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd audit --omit=dev`, and `npm.cmd run test:e2e`.
- [ ] Confirm Git diff/check/status, commit final fixes, and report verified evidence, files, environment variables, and Phase 2 items.
