# Production Launch Checklist

No step in this document is performed automatically by the repository refactor.

1. Back up the Google spreadsheet.
2. Populate `Products` and `Reel_Product_Map` as described in `docs/PRODUCT_IMPORT.md`.
3. Confirm Customers, Inquiries, and Events use the documented headers.
4. Share the spreadsheet only with the least-privilege service account.
5. Set production Google credentials and `DATA_PROVIDER=google-sheets`.
6. Configure Upstash REST credentials so limits hold across serverless instances.
7. Confirm the offer/contact/privacy copy, add only approved trust metrics, and
   leave the brand-video URL blank unless an approved HTTPS asset exists.
8. Enable the enquiry counter only after approving the exact-tuple display
   policy and minimum count.
9. Run lint, TypeScript, unit tests, Playwright, production build, audit, and
   secret/client-bundle scans.
10. Deploy through the approved hosting workflow.
11. Smoke-test an exact valid tuple, inactive tuple, tampered tuple, new
    customer, repeat customer, and idempotent replay.
12. Confirm the browser never displays product identity or catalogue content.
13. Test the documented ManyChat URLs with a sandbox account.
14. Connect the main Instagram account only after all earlier checks pass.

Do not fabricate missing video, metrics, or enquiry proof during launch setup.
