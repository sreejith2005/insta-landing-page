import { useEffect, useRef, useState } from "react";

import { PassCard } from "@/components/pass/PassCard";
import { experienceCopy, successSteps } from "@/config/experience";
import { passConfig } from "@/config/pass";
import { CALENDLY_ORIGIN } from "@/lib/contact/calendly";
import type { FunnelEventName } from "@/types/funnel";
import { CalendlyInline } from "./CalendlyInline";

export type BookingLinks = { videoUrl?: string; storeUrl?: string };

export type BookingType = "video_call" | "store_visit";

/** Fire-and-forget analytics for the post-enquiry actions. */
export type TrackSuccessEvent = (eventName: FunnelEventName, metadata?: { bookingType: BookingType }) => void;

const bookingActions = [
  {
    type: "video_call",
    key: "videoUrl",
    title: "Video call demo",
    description: "See the jewellery live, from home",
    note: "A jewellery expert will walk you through the piece over a video call.",
    openedEvent: "calendly_video_call_opened",
  },
  {
    type: "store_visit",
    key: "storeUrl",
    title: "Store visit",
    description: "See and try it in person",
    note: "Our team will have the piece ready for you when you arrive.",
    openedEvent: "calendly_store_visit_opened",
  },
] as const;

/**
 * How long after the confirmation appears the schedulers start loading in the
 * background, so the success animation is not competing with Calendly.
 */
const SCHEDULER_WARM_UP_MS = 600;

const WHATSAPP_LABEL = "Chat with a representative on WhatsApp";
const WHATSAPP_HINT = "Fastest reply · Talk to our team directly";
/** Shown above the booking choices; booking is never required. */
const BOOKING_DIVIDER = "Or book a time that suits you (optional)";
const BOOKING_HEADING = "Book a time that suits you (optional)";

/** The customer's store pass, as returned with the accepted enquiry. */
export type SuccessPass = { code: string; path: string; qrPath: string; validUntil: string };

/**
 * "Planning to visit our store?" — opens the pass (QR, code, validity) in
 * place. The pass exists from the moment the enquiry was saved; this only
 * decides when the customer sees it.
 */
function StorePass({ pass, firstName, track }: { pass: SuccessPass; firstName?: string; track?: TrackSuccessEvent }) {
  const [open, setOpen] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      track?.("store_pass_opened");
      requestAnimationFrame(() => card.current?.scrollIntoView?.({ behavior: "smooth", block: "center" }));
    }
  }

  return (
    <div className="success-pass">
      <button
        type="button"
        className="booking-option store-pass-option"
        aria-expanded={open}
        aria-controls="store-pass"
        onClick={toggle}
      >
        <span className="booking-option-icon" aria-hidden="true"><QrIcon /></span>
        <span className="booking-option-text">
          <span className="booking-option-title">{passConfig.revealLabel}</span>
          <span className="booking-option-description">{passConfig.revealHint}</span>
        </span>
        <span className="booking-option-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div id="store-pass" className="success-pass-card" ref={card}>
          <PassCard code={pass.code} qrSrc={pass.qrPath} validUntil={pass.validUntil} firstName={firstName} />
          <a className="success-pass-link" href={pass.path} target="_blank" rel="noopener">
            Open my pass in a new tab
          </a>
        </div>
      ) : null}
    </div>
  );
}

function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
      <path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 18.5v2M18.5 14h2" />
    </svg>
  );
}

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
 * below it, and only picking one shows its scheduler (both are pre-loaded,
 * hidden, moments after the confirmation appears). Each booking button
 * appears only when a Calendly link exists for it, and WhatsApp only when a CRM
 * number is configured — WhatsApp is an ordinary link, so choosing it neither
 * opens nor closes a scheduler.
 * Nothing here names the piece.
 */
function BookingOptions({
  booking,
  whatsappUrl,
  inquiryId,
  pass,
  firstName,
  track,
}: {
  booking?: BookingLinks;
  whatsappUrl?: string;
  inquiryId?: string;
  pass?: SuccessPass;
  firstName?: string;
  track?: TrackSuccessEvent;
}) {
  const [open, setOpen] = useState<BookingType | null>(null);
  // Schedulers are mounted (hidden) shortly after the confirmation appears, so
  // Calendly has usually finished loading by the time the customer picks one.
  const [warm, setWarm] = useState(false);
  const panels = useRef<Partial<Record<BookingType, HTMLDivElement | null>>>({});
  // Read inside the mount effect so a fresh `track` identity never re-fires an
  // event. Declared first, so it is up to date before that effect runs.
  const latestTrack = useRef(track);
  useEffect(() => {
    latestTrack.current = track;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setWarm(true), SCHEDULER_WARM_UP_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // The "opened" event belongs to the scheduler actually appearing, not to the
  // click: it fires as the panel is shown, and again when the customer swaps to
  // the other option. Closing the open one fires nothing.
  useEffect(() => {
    if (!open) return;
    const action = bookingActions.find((candidate) => candidate.type === open);
    if (action) latestTrack.current?.(action.openedEvent, { bookingType: open });
  }, [open]);

  // Only one scheduler is visible at a time, so it identifies the booking type.
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
  if (!actions.length && !whatsappUrl && !pass) return null;

  function choose(type: BookingType) {
    const next = open === type ? null : type;
    setOpen(next);
    // Bring the newly shown scheduler into view; on a phone it opens below the fold.
    if (next) requestAnimationFrame(() => panels.current[next]?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
  }

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
      {pass ? <StorePass pass={pass} firstName={firstName} track={track} /> : null}
      {actions.length ? (
        <>
          <p className="success-booking-divider">
            {whatsappUrl ? BOOKING_DIVIDER : BOOKING_HEADING}
          </p>
          <div className="success-booking-actions success-choice">
            {actions.map((action) => (
              <button
                type="button"
                className="booking-option"
                key={action.type}
                aria-expanded={open === action.type}
                aria-controls={`booking-${action.type}`}
                // Tracking happens when the panel is shown, in the effect above.
                onClick={() => choose(action.type)}
              >
                <span className="booking-option-icon" aria-hidden="true">
                  {action.type === "video_call" ? <VideoIcon /> : <StoreIcon />}
                </span>
                <span className="booking-option-text">
                  <span className="booking-option-title">{action.title}</span>
                  <span className="booking-option-description">{action.description}</span>
                </span>
                <span className="booking-option-chevron" aria-hidden="true" />
              </button>
            ))}
          </div>
          {actions.map((action) =>
            warm || open === action.type ? (
              <div
                key={action.type}
                ref={(node) => {
                  panels.current[action.type] = node;
                }}
                id={`booking-${action.type}`}
                // A closed scheduler stays rendered, transparent and inert,
                // rather than `display: none`: Calendly pauses loading in a
                // hidden frame, which is the wait this pre-loading avoids.
                className={open === action.type ? "booking-panel" : "booking-panel is-preloading"}
                role="region"
                aria-label={action.title}
                aria-hidden={open !== action.type || undefined}
                inert={open !== action.type}
              >
                <div className="booking-panel-head">
                  <p className="booking-panel-eyebrow">{action.title}</p>
                  <h2 className="booking-panel-title">Choose a day and time</h2>
                  <p className="booking-panel-note">{action.note}</p>
                </div>
                <CalendlyInline url={booking![action.key]!} inquiryId={inquiryId} bookingType={action.type} />
              </div>
            ) : null,
          )}
        </>
      ) : null}
    </div>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 9.5 5 4h14l1.5 5.5" />
      <path d="M3.5 9.5c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0 1.4 1.1 2.5 2.5 2.5h2c1.4 0 2.5-1.1 2.5-2.5 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5" />
      <path d="M5 12v8h14v-8" />
      <path d="M10 20v-4.5h4V20" />
    </svg>
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
  pass,
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
  /** The store pass, shown on request under the WhatsApp button. */
  pass?: SuccessPass;
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
          <BookingOptions
            booking={booking}
            whatsappUrl={whatsappUrl}
            inquiryId={inquiryId}
            pass={pass}
            firstName={firstName}
            track={track}
          />
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
