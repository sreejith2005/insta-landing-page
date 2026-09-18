# Bookings, WhatsApp and the Calendly webhook

After an enquiry is accepted, the success state offers up to three actions. None of them shows the product name, specifications or price.

| Action | Shown when | Browser event(s) |
| --- | --- | --- |
| Book a video call | Product row has a `https://calendly.com/...` `calendly_video_url` | `calendly_video_call_opened`, then `calendly_date_time_selected` / `calendly_event_scheduled` |
| Book a store visit | Product row has a `https://calendly.com/...` `calendly_store_url` | `calendly_store_visit_opened`, then the same two |
| Chat with us on WhatsApp | `CRM_WHATSAPP_NUMBER` is set | `whatsapp_contact_clicked` |

The booking buttons open Calendly's official inline embed (`assets.calendly.com/assets/external/widget.js`). The WhatsApp link is a `wa.me` deep link whose message comes from `whatsappMessageTemplate` in `config/experience.ts`, filled in with the product name and ID.

## Browser events are signals, not bookings

Calendly's `postMessage` events only report *that* a slot was picked or booked. They do not say when the slot is, and they are lost if the tab closes or an ad blocker drops the request. Use the Bookings tab for "did they book, and for when".

## Calendly webhook → Bookings tab

`POST /api/webhooks/calendly` checks the `Calendly-Webhook-Signature` header on every request. It must be an HMAC-SHA256 of `t.rawBody`, keyed with the subscription's signing key and sent no more than 3 minutes earlier. On a valid `invitee.created`, the endpoint appends one row to the Bookings tab:

`created_at, booking_type, scheduled_start, scheduled_end, invitee_name, invitee_email, product_id, reel_id, campaign_id, calendly_invitee_uri`

- `booking_type` is `video_call` or `store_visit`. It is decided by `CALENDLY_VIDEO_EVENT_TYPES` / `CALENDLY_STORE_EVENT_TYPES`, and is `unknown` when the event type is in neither list.
- `product_id`, `reel_id` and `campaign_id` come from the invitee's most recent Inquiries row. That row is matched by phone: the SMS reminder number, or any booking-question answer that is an Indian mobile. **The Inquiries tab has no email column, so email alone never matches.** To make the join reliable, add a required "Mobile number" question to both Calendly event types.
- Retries are deduplicated by `calendly_invitee_uri`. A failed sheet write returns 503, so Calendly retries.
- Other signed events (for example `invitee.canceled`) are acknowledged and ignored.

### Setup

1. Create a `Bookings` tab with the header row above, or set `GOOGLE_BOOKINGS_SHEET`.
2. Create a webhook subscription through the Calendly API (`POST https://api.calendly.com/webhook_subscriptions`). Use the events `["invitee.created"]`, the URL `https://<your-domain>/api/webhooks/calendly` and a `signing_key` of your choosing.
3. Set `CALENDLY_WEBHOOK_SIGNING_KEY` to that same key, and list the event type URIs in `CALENDLY_VIDEO_EVENT_TYPES` / `CALENDLY_STORE_EVENT_TYPES`.
