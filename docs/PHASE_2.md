# Phase 2 Production Integration Checklist

Phase 1 provides the application and real integration boundaries. Phase 2 begins only when the business supplies the authoritative inputs below.

## Required business inputs

- Approved transparent/cropped MK Jewels logo variants or permission to prepare optimized derivatives from the supplied JPEGs.
- At least one approved product image, canonical ID, name, specifications, and active status.
- Authoritative Reel/product-position/campaign mapping for the ManyChat test flow.
- Final offer wording, eligibility, and genuine expiry policy.
- Calendly store-visit and video-consultation URLs, allowed origins, and booking callback/event contract.
- Approved WhatsApp number and message wording.
- Google spreadsheet ID, service account, final tabs/headers, and least-privilege access.
- Approved privacy/consent wording and retention policy.

## Phase 2 engineering work

1. Add signed opaque context tokens and ManyChat contract tests; retain canonical product resolution upstream.
2. Connect the production Product Master and validate one-product and multi-product Reel journeys.
3. Upgrade Google Sheets writes to header-indexed batches with production observability and reconciliation.
4. Replace the process-local limiter with a shared durable limiter and verify fail-closed behavior.
5. Configure Calendly URLs, validate embed origins, and capture `appointment_booked` only from a reliable verified callback.
6. Configure WhatsApp and route callback requests into the approved CRM/FMS operational workflow.
7. Add approved consent fields only after the policy is finalized.
8. Run authenticated Instagram → ManyChat → microsite → Sheets → appointment/callback end-to-end QA.
9. Test current Chrome Android, Safari iOS, Chrome desktop, and available Safari/Edge on real devices or approved device infrastructure.
10. Complete deployment review: HTTPS/custom domain, secrets, CSP hosts, distributed rate limiting, provider quotas, monitoring, backups, and rollback.

## Explicit non-claims

- Preview records are not production leads.
- The current sample products do not include approved product imagery.
- A successful local Calendly selection is not proof of a booking.
- Google Sheets code and unit tests are not evidence of live spreadsheet authorization.
- Browser automation is not evidence of a live Instagram/ManyChat integration.
