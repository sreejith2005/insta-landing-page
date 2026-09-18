# Products and Reel_Product_Map

Both tabs are attribution data, not a customer-facing catalogue. Nothing in
them is displayed on the landing page.

## `Products` — one row per product

| Column | Required | Purpose |
| --- | --- | --- |
| `product_id` | Yes | Canonical product identifier (the `product` URL parameter) |
| `product_name` | Yes | Internal reporting name copied to Inquiries |
| `reel_id` | No* | Reel the product was first posted in |
| `campaign_id` | No* | Campaign the product was first posted in |
| `product_position` | No | Fallback position if the map row has none |
| `active_status` | Recommended | `FALSE` switches the product off in every Reel |
| `category` | No | Internal reporting field |
| `collection` | No | Internal reporting field |
| `campaign_name` | No | Internal reporting label |
| `image_url` | No | Product image, copied to the Instagram FMS tab's `IMAGE` column; never shown on the page |
| `calendly_video_url` | No | `https://calendly.com/...` scheduling link; adds a "Book a video call" button (inline Calendly scheduler) after the enquiry is saved. Other hosts are ignored. |
| `calendly_store_url` | No | `https://calendly.com/...` scheduling link; adds a "Book a store visit" button (inline Calendly scheduler) after the enquiry is saved. Other hosts are ignored. |

\* Required only in flat mode (`GOOGLE_REEL_MAP_SHEET` empty).

## `Reel_Product_Map` — one row per product per Reel/campaign

| Column | Required | Purpose |
| --- | --- | --- |
| `reel_id` | Yes | Reel the customer came from |
| `campaign_id` | Yes | Campaign the customer came from |
| `product_position` | Recommended | 1-based position in the Reel ("second one" → 2) |
| `product_id` | Yes | Must exist in `Products` |
| `active_status` | Yes | `TRUE`, `yes`, `1` or `active` enables this link |

A customer link `/instagram?product=P&reel=R&campaign=C` resolves only when a
map row matches `P + R + C` exactly and `P` exists in `Products`. The link is
active only if the map row is active and the product is not switched off.

To reuse a product in a new Reel, add a map row; do not duplicate the product.

## Rules

- The application never changes the spreadsheet schema.
- Columns are matched by header name, so order does not matter, but names must
  match exactly.
- Only the columns above are read. Specification, price and messaging columns
  are ignored.
- Keep Customers, Inquiries and Events history. Never insert or delete a column
  in Inquiries without shifting the existing rows with it, or old rows will be
  read under the wrong headers.
- Test a link in a non-production environment before sharing it in ManyChat.
