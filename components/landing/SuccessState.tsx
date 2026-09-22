import { useEffect, useRef, useState } from "react";

import { experienceCopy, successSteps } from "@/config/experience";
import { CALENDLY_ORIGIN } from "@/lib/contact/calendly";
import type { FunnelEventName } from "@/types/funnel";
import { CalendlyInline } from "./CalendlyInline";

export type BookingLinks = { videoUrl?: string; storeUrl?: string };

export type BookingType = "video_call" | "store_visit";

/** Fire-and-forget analytics for the post-enquiry actions. */
export type TrackSuccessEvent = (eventName: FunnelEventName, metadata?: { bookingType: BookingType }) => void;

const bookingActions = [
  { type: "video_call", key: "videoUrl", label: "Book a video call demo", openedEvent: "calendly_video_call_opened" },
  { type: "store_visit", key: "storeUrl", label: "Book a store visit", openedEvent: "calendly_store_visit_opened" },
] as const;

const WHATSAPP_LABEL = "Chat with a representative on WhatsApp";
const WHATSAPP_HINT = "Fastest reply · Talk to our team directly";
/** Shown above the booking choices; booking is never required. */
const BOOKING_DIVIDER = "Or book a time that suits you (optional)";
const BOOKING_HEADING = "Book a time that suits you (optional)";

/**
 * Calendly's postMessage events → our event names. They carry no date or time,
 * only that a selection or booking happened.
 */
const calendlyMessages: Partial<Record<string, FunnelEventName>> = {
  "calendly.date_and_time_selected": "calendly_date_time_selected",
  "calendly.event_scheduled": "calendly_event_scheduled",
};

/**
 * Post-enquiry next steps, as a choice rather than an automatic embed. WhatsApp
 * leads as the full-width primary action; the two optional booking choices sit
 * below it, and only picking one mounts a scheduler. Each booking button
 * appears only when a Calendly link exists for it, and WhatsApp only when a CRM
 * number is configured — WhatsApp is an ordinary link, so choosing it neither
 * opens nor closes a scheduler.
 * Nothing here names the piece.
 */
function BookingOptions({
  booking,
  whatsappUrl,
  inquiryId,
  track,
}: {
  booking?: BookingLinks;
  whatsappUrl?: string;
  inquiryId?: string;
  track?: TrackSuccessEvent;
}) {
  const [open, setOpen] = useState<BookingType | null>(null);
  // Read inside the mount effect so a fresh `track` identity never re-fires an
  // event. Declared first, so it is up to date before that effect runs.
  const latestTrack = useRef(track);
  useEffect(() => {
    latestTrack.current = track;
  });

  // The "opened" event belongs to the scheduler actually appearing, not to the
  // click: it fires as the widget mounts, and again when the customer swaps to
  // the other option. Closing the open one fires nothing.
  useEffect(() => {
    if (!open) return;
    const action = bookingActions.find((candidate) => candidate.type === open);
    if (action) latestTrack.current?.(action.openedEvent, { bookingType: open });
  }, [open]);

  // Only one scheduler is open at a time, so it identifies the booking type.
  useEffect(() => {
    if (!open || !track) return;
    function onMessage(event: MessageEvent) {
      if (event.origin !== CALENDLY_ORIGIN) return;
      const name = (event.data as { event?: unknown } | null)?.event;
      const eventName = typeof name === "string" ? calendlyMessages[name] : undefined;
      if (eventName && open) track?.(eventName, { bookingType: open });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, track]);

  const actions = bookingActions.filter((action) => booking?.[action.key]);
  if (!actions.length && !whatsappUrl) return null;
  const openAction = actions.find((action) => action.type === open);

  return (
    <div className="success-booking">
      {whatsappUrl ? (
        <a
          className="cta-link cta-whatsapp success-whatsapp"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          // Sent with `keepalive`, so it survives the page losing focus to WhatsApp.
          onClick={() => track?.("whatsapp_contact_clicked")}
        >
          <WhatsAppIcon />
          <span className="success-whatsapp-text">
            <span className="success-whatsapp-label">{WHATSAPP_LABEL}</span>
            <span className="success-whatsapp-hint">{WHATSAPP_HINT}</span>
          </span>
          <span className="cta-arrow" aria-hidden="true">↗</span>
        </a>
      ) : null}
      {actions.length ? (
        <>
          <p className="success-booking-divider">
            {whatsappUrl ? BOOKING_DIVIDER : BOOKING_HEADING}
          </p>
          <div className="success-booking-actions success-choice">
            {actions.map((action) => (
              <button
                type="button"
                className="cta-link cta-outline"
                key={action.type}
                aria-expanded={open === action.type}
                aria-controls={open === action.type ? `booking-${action.type}` : undefined}
                // Tracking happens when the widget mounts, in the effect above.
                onClick={() => setOpen(open === action.type ? null : action.type)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {openAction ? (
        <CalendlyInline
          key={openAction.type}
          id={`booking-${openAction.type}`}
          url={booking![openAction.key]!}
          label={openAction.label}
          inquiryId={inquiryId}
        />
      ) : null}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"
      />
    </svg>
  );
}

export function SuccessState({
  isRepeatCustomer,
  offerCopy,
  contactCopy,
  firstName,
  booking,
  whatsappUrl,
  inquiryId,
  track,
}: {
  isRepeatCustomer: boolean;
  offerCopy?: string;
  contactCopy?: string;
  firstName?: string;
  booking?: BookingLinks;
  /** Pre-built wa.me link; its pre-filled text is never shown on the page. */
  whatsappUrl?: string;
  /** The accepted enquiry; passed to Calendly so the booking webhook can join on it. */
  inquiryId?: string;
  track?: TrackSuccessEvent;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <main className="success-state">
      <section className="band band-dark success-hero" aria-labelledby="success-heading">
        <div className="container success-inner">
          <div className="success-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" role="presentation">
              <circle className="success-ring" cx="32" cy="32" r="29" />
              <path className="success-check" d="m20 33 8 8 17-18" />
            </svg>
          </div>
          <p className="eyebrow on-dark">{experienceCopy.announcement}</p>
          <h1 id="success-heading" ref={heading} tabIndex={-1}>
            {offerCopy || experienceCopy.successHeadline}
          </h1>
          {isRepeatCustomer ? <p className="repeat-welcome">{experienceCopy.repeatWelcome}</p> : null}
          {firstName ? <p className="thank-you">Thank you, {firstName.split(/\s+/)[0]}.</p> : null}
          <p className="success-description">{experienceCopy.successDescription}</p>
          <p className="success-discount">
            <span aria-hidden="true">◆</span> {experienceCopy.successDiscountApplied}
          </p>
          <p className="success-contact">{contactCopy || experienceCopy.representativeContact}</p>
          <BookingOptions booking={booking} whatsappUrl={whatsappUrl} inquiryId={inquiryId} track={track} />
        </div>
      </section>
      <section className="band band-ivory success-next" aria-labelledby="next-heading">
        <div className="container">
          <div className="section-intro">
            <p className="eyebrow">What happens next</p>
            <h2 id="next-heading">Your personal assistance has begun</h2>
          </div>
          <ol className="journey-list success-steps">
            {successSteps.map((step, index) => (
              <li className="journey-step" key={step.title}>
                <span className="journey-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="success-footnote">
            <span aria-hidden="true">◇</span> {experienceCopy.successFootnote}
          </p>
        </div>
      </section>
    </main>
  );
}
