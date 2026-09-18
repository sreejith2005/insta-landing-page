# ManyChat Integration Contract

ManyChat owns the Instagram conversation and product-position resolution. The
landing page begins only after ManyChat has selected a canonical product ID.

> **The Product ID is attribution data, not customer-facing product content.**

## Parameters

| Parameter | Required | Meaning |
| --- | --- | --- |
| `product` | Yes | Canonical `Products.product_id` |
| `reel` | Yes | Originating `reel_id` |
| `campaign` | Yes | Originating `campaign_id` |
| `source` | No | `instagram`, `manychat`, `whatsapp`, or `direct` |
| `utm_source` | No | Marketing attribution |
| `utm_medium` | No | Marketing attribution |
| `utm_campaign` | No | Marketing attribution |
| `utm_content` | No | Marketing attribution, including resolved position |
| `utm_term` | No | Marketing attribution |
| `u` (alias `ig`) | No | Customer's Instagram username, with or without `@` |
| `dm_ts` | No | When the DM arrived: Unix milliseconds (seconds also accepted) or ISO 8601 |

Identifiers allow letters, digits, `_`, and `-`, up to 80 characters. UTM
values are bounded and validated before persistence.

`u` and `dm_ts` are lead data, not attribution: they are submitted with the
enquiry (and written to the Instagram FMS tab) but never recorded as funnel
events. A malformed value is silently dropped; it never blocks the page.

## Required: DM context on the "Yes, show me" button

The ManyChat flow's **"Yes, show me"** dynamic block must append the DM context
to the landing URL, in addition to the `product`, `reel`, `campaign` (and any
`source`/UTM) parameters it already sets:

```text
&u={{username}}&dm_ts={{timestamp}}
```

Full template:

```text
https://<domain>/instagram?product=<id>&reel=<reel>&campaign=<campaign>&source=manychat&u={{username}}&dm_ts={{timestamp}}
```

Without these the lead still saves, but the Instagram FMS tab's `INSTAGRAM ID`
and `DM RECEIVED DATE` columns are left blank for the team to fill manually.

## Single-product example

```text
/instagram?product=MK001&reel=R101&campaign=RAKHI26&source=manychat
```

Required active `Reel_Product_Map` row (and `MK001` present in `Products`):

```text
reel_id | campaign_id | product_position | product_id | active_status
R101    | RAKHI26     | 1                | MK001      | TRUE
```

## Multi-product example

If the customer says "second one", ManyChat resolves that phrase to `MK002`.

```text
/instagram?product=MK002&reel=R101&campaign=RAKHI26&source=manychat&utm_content=position_2
```

Relevant `Reel_Product_Map` rows (each `product_id` must exist in `Products`):

| reel_id | campaign_id | product_position | product_id | active_status |
| --- | --- | --- | --- | --- |
| `R101` | `RAKHI26` | `1` | `MK001` | `TRUE` |
| `R101` | `RAKHI26` | `2` | `MK002` | `TRUE` |
| `R101` | `RAKHI26` | `3` | `MK003` | `TRUE` |

The website records `MK002`. It does not interpret "second one" and does not
display `MK002` or its internal name.

## Validation and failure behavior

The `product + reel + campaign` tuple must match one active row exactly.
Changing any member of the tuple produces a safe recovery state. Missing or
malformed parameters cannot be attributed and do not produce an event.

ManyChat must not create a landing URL until it has resolved a single product.
The app performs no Instagram automation, scraping, or free-text matching.
