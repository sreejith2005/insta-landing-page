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

const WHATSAPP_LABEL = "Chat on WhatsApp";

/**
 * Calendly's postMessage events → our event names. They carry no date or time,
 * only that a selection or booking happened.
 */
const calendlyMessages: Partial<Record<string, FunnelEventName>> = {
  "calendly.date_and_time_selected": "calendly_date_time_selected",
  "calendly.event_scheduled": "calendly_event_scheduled",
};

/**
 * Post-enquiry next steps, as a choice rather than an automatic embed: the
 * customer picks one of up to three actions and only then is a scheduler
 * mounted. Each booking button appears only when the product has that Calendly
 * link, and WhatsApp appears only when a CRM number is configured — WhatsApp is
 * an ordinary link, so choosing it neither opens nor closes a scheduler.
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
      <div className="success-booking-actions success-choice">
        {actions.map((action) => (
          <button
            type="button"
            className="cta-link cta-gold"
            key={action.type}
            aria-expanded={open === action.type}
            aria-controls={open === action.type ? `booking-${action.type}` : undefined}
            // Tracking happens when the widget mounts, in the effect above.
            onClick={() => setOpen(open === action.type ? null : action.type)}
          >
            {action.label}
          </button>
        ))}
        {whatsappUrl ? (
          <a
            className="cta-link cta-whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            // Sent with `keepalive`, so it survives the page losing focus to WhatsApp.
            onClick={() => track?.("whatsapp_contact_clicked")}
          >
            {WHATSAPP_LABEL}
            <span className="cta-arrow" aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
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
