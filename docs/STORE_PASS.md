# Store Pass

Every enquiry gets its own pass code (for example `MK30-7KQ4-X9MP`) and a QR
code. A store visit or purchase made with the pass is linked back to the exact
Instagram Reel, campaign and product that brought the customer in.

## Customer

1. Fills in the enquiry form. The pass is created and saved in the same moment,
   in the enquiry's `Inquiries` row (`pass_code`) and in `Instagram_FMS`
   (`BENEFIT CODE`).
2. Thank-you screen:
   - **Chat with a representative on WhatsApp**: the pre-filled message
     includes the code, so the CRM team can match online customers.
   - **Planning to visit our store?**: shows the pass (QR, code, valid-till
     date). The customer takes a screenshot, or reopens the pass link.
3. Passes are valid for `PASS_VALIDITY_DAYS` (default 60) days.

## Store staff

1. Scan the customer's QR with the phone's normal camera (no app needed), or
   open `/staff` and type the code.
2. First time on a phone: choose the store, enter the store PIN and your name.
   The phone stays logged in for 30 days.
3. Ask the customer for the last 4 digits of their mobile and match them on
   screen.
4. Tap **Customer visited** (the pass stays usable), or **Purchased with
   discount** and enter the invoice number and bill amount (the pass is then
   used).
5. A used pass shows **ALREADY USED** with when, where, who and the invoice.
6. The CRM team uses the same screen with the **Online / CRM** store.

## Sheets

- `Store_Visits`: one row per staff action. Each row carries the Reel,
  campaign and product, so filter this tab by `reel_id` or `campaign_id` to
  see which Reels brought walk-ins and sales. Do not edit rows by hand; add a
  note next to a row to correct it.
- `Stores`: `store | pin | active`.
  - To add a store, add a row.
  - To open Ulhasnagar, set `active` to TRUE.
  - To lock a store's phones out, change its PIN.
- If any pass column is missing from a tab, the app adds it to the header row
  itself rather than losing the value.

## Settings (Vercel → Project → Settings → Environment Variables)

- `PASS_SECRET` (required): at least 32 random characters. Without it, no
  passes are issued. Never change it once passes exist, or their QR links stop
  working.
- `PASS_VALIDITY_DAYS` (optional): defaults to 60.
- `NEXT_PUBLIC_APP_URL`: the live site address, which the QR codes open.

## Logs

Vercel logs get one JSON line per event: `lead.accepted`, `pass.visited`,
`pass.purchased`, `pass.purchase_denied`, `staff.login` and
`staff.login_failed`. Each line carries codes and IDs only, never names or
phone numbers.
