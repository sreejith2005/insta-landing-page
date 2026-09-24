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

1. Scan the customer's QR with the phone's normal camera (no app needed). It
   opens the staff check screen. Or open `/staff` and type the code.
2. First time on a phone: choose the store, enter the store PIN and your name.
   The phone stays logged in for 30 days, in that phone's default browser.
3. The screen shows **Valid pass**, **Already used** or **Expired**, with the
   customer's name and the last 4 digits of their mobile. Ask the customer for
   those 4 digits and match them.
4. Apply the benefit on the bill, then tap **Give discount** and enter the
   invoice number and bill amount. The pass is now used and cannot be used
   again at any store.
5. If the customer only looks around, tap **Visited, no purchase**. The pass
   stays usable.
6. The CRM team uses the same screen with the **Online / CRM** store.

A customer who scans their own QR sees a note that it is for store staff.
Their pass link (from the thank-you screen) still shows their pass.

## Sheets

- `Store_Visits`: one row per staff action. Each row carries the Reel,
  campaign and product, so filter this tab by `reel_id` or `campaign_id` to
  see which Reels brought walk-ins and sales. Do not edit rows by hand; add a
  note next to a row to correct it.
- `Stores`: `Store | PIN | Active` (header case does not matter).
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
