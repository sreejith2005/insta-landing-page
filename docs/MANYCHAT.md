# ManyChat Integration Contract

ManyChat owns the Instagram conversation. This application begins only when the
customer taps the CTA in the DM. The app performs no Instagram automation,
scraping, or natural-language product matching.

**ManyChat must resolve a canonical `product_id` before sending the link.**

## Request format

The CTA opens `/instagram` with query parameters:

| Parameter | Required | Meaning | Format |
| --- | --- | --- | --- |
| `product` | Yes | Canonical Product Master `product_id` | Letters, digits, `_`, `-`; max 80 |
| `reel` | Yes | Originating Reel `reel_id` | Letters, digits, `_`, `-`; max 80 |
| `campaign` | Yes | Originating campaign `campaign_id` | Letters, digits, `_`, `-`; max 80 |
| `source` | No | Entry point; defaults to `instagram` | One of `instagram`, `manychat`, `whatsapp`, `direct` |
| `utm_source` | No | Marketing attribution | Max 120 chars |
| `utm_medium` | No | Marketing attribution | Max 120 chars |
| `utm_campaign` | No | Marketing attribution | Max 120 chars |
| `utm_content` | No | Marketing attribution | Max 120 chars |
| `utm_term` | No | Marketing attribution | Max 120 chars |

The three identifiers must match one **active** `Product_Master` row as a
complete triple. Changing any one parameter does not resolve a different
product — it produces a safe recovery state instead.

## Example 1 — single-product Reel

Reel `R123` shows one bracelet, so ManyChat sends the product ID directly.

```text
https://funnel.mkjewels.in/instagram?product=MKBR639&reel=R123&campaign=RAKHI26&source=instagram&utm_source=instagram&utm_medium=reel&utm_campaign=rakhi26
```

Required `Product_Master` row:

| product_id | reel_id | campaign_id | product_position | active_status |
| --- | --- | --- | --- | --- |
| `MKBR639` | `R123` | `RAKHI26` | `1` | `TRUE` |

## Example 2 — multi-product Reel, position already resolved

Reel `R456` shows two rings. The DM flow asks which piece the customer means and
maps the reply (`second`, `2`, "the solitaire") to a canonical product ID
**inside ManyChat**. Only the resolved ID is sent.

```text
https://funnel.mkjewels.in/instagram?product=RG5074&reel=R456&campaign=BRIDAL26&source=manychat&utm_source=instagram&utm_medium=reel&utm_campaign=bridal26&utm_content=position_2
```

Required `Product_Master` rows:

| product_id | reel_id | campaign_id | product_position | active_status |
| --- | --- | --- | --- | --- |
| `RG5073` | `R456` | `BRIDAL26` | `1` | `TRUE` |
| `RG5074` | `R456` | `BRIDAL26` | `2` | `TRUE` |

`product_position` is the mapping ManyChat reads to turn "second product" into
`RG5074`. The application stores it for reporting but never resolves a product
from a position, because position alone is not a trustworthy URL parameter.

## ManyChat setup checklist

1. Create a Custom Field per Reel holding `reel_id` and `campaign_id`.
2. For a multi-product Reel, add a quick-reply step mapping each option to its
   canonical `product_id` using the `product_position` column as the reference.
3. Build the CTA URL from those fields. Do not let the customer type the
   identifiers.
4. If ManyChat cannot resolve a single product, do not send the link — keep
   clarifying in the DM. An unresolvable context only produces a recovery state.

## Failure behaviour

| Situation | Customer sees | Event recorded |
| --- | --- | --- |
| Missing or malformed parameters | "We could not find this selection" | none (nothing valid to attribute) |
| Triple matches no row | "We could not find this selection" | `product_context_failed` (`reason: missing`) |
| Row exists but `active_status` is not true | "This piece is currently unavailable" | `product_context_failed` (`reason: inactive`) |
| Unapproved `source` value | "We could not find this selection" | none |

## Not in scope

- Unofficial Instagram automation, scraping, or mass DM sending.
- Product matching from free text inside this application.
- Signed context tokens. The URL contract above is the current agreement; a
  signed opaque token is the intended hardening step before wide rollout.
