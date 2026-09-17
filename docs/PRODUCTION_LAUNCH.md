# Production Launch Checklist

No step in this document is performed automatically by the repository refactor.

1. Back up the Google spreadsheet.
2. Complete the flat Product_Master migration in `docs/PRODUCT_IMPORT.md`.
3. Confirm Customers, Inquiries, and Events use the documented headers.
4. Share the spreadsheet only with the least-privilege service account.
5. Set production Google credentials and `DATA_PROVIDER=google-sheets`.
6. Configure Upstash REST credentials so limits hold across serverless instances.
7. Set approved offer/contact copy; leave the future video URL blank unless an
   approved HTTPS asset exists.
8. Run lint, TypeScript, unit tests, Playwright, production build, audit, and
   secret/client-bundle scans.
9. Deploy through the approved hosting workflow.
10. Smoke-test an exact valid tuple, inactive tuple, tampered tuple, new
    customer, repeat customer, and idempotent replay.
11. Confirm the browser never displays product identity or catalogue content.
12. Test the documented ManyChat URLs with a sandbox account.
13. Connect the main Instagram account only after all earlier checks pass.

The future brand video, trust metrics, enquiry counter, and redesigned landing
page are explicitly outside this cleanup phase.
