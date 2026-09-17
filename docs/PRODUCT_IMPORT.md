# Product_Master Attribution Import and Migration

Product_Master is a flat attribution/mapping tab, not a product catalogue.

## Canonical headers

| Column | Required | Purpose |
| --- | --- | --- |
| `product_id` | Yes | Canonical product attribution identifier |
| `product_name` | Yes | Internal reporting name copied to Inquiries |
| `reel_id` | Yes | Originating Reel |
| `campaign_id` | Yes | Originating campaign |
| `product_position` | Recommended | One-based position for ManyChat administration |
| `active_status` | Yes | `TRUE`, `yes`, `1`, or `active` enables the tuple |
| `category` | No | Internal reporting field |
| `collection` | No | Internal reporting field |
| `campaign_name` | No | Internal reporting label |

One row represents one authoritative `product_id + reel_id + campaign_id`
tuple. Repeating a product across Reels or campaigns requires separate rows.

## Manual migration

The application never changes the spreadsheet schema automatically.

1. Back up the spreadsheet and export every existing tab.
2. Create or revise `Product_Master` using the canonical headers above.
3. For a prior single-tab catalogue, copy only attribution/reporting fields.
4. For an unfinished `Products` plus `Reel_Product_Map` split, create one flat
   row per mapping and copy the matching internal `product_name`.
5. Do not copy image, specification, price, offer-expiry, appointment,
   messaging, or CTA configuration fields.
6. Preserve Customers, Inquiries, Events, and all historical rows.
7. Add `product_name` to Inquiries if internal reporting needs it. Existing
   rows may remain blank; new accepted inquiries populate it from the validated
   mapping.
8. Archive the historical `Callback_Requests` tab if desired; do not destroy it.
9. Validate single-product and multi-product URLs in a non-production
   environment before switching production configuration.

Use [product-master-template.csv](product-master-template.csv) as the header
template. Do not import it using "Replace spreadsheet" because that would
destroy operational tabs.
