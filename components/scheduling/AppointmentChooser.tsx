"use client";

import { useCallback, useMemo, useState } from "react";

import { appointmentCopy } from "@/config/experience";
import { trackFunnelEvent, type TrackingContext } from "@/lib/attribution/client-events";
import type { AppointmentType, PublicProductContext } from "@/types/funnel";
import { CalendlyEmbed, type CalendlyBooking } from "./CalendlyEmbed";

type Props = {
  calendly: PublicProductContext["calendly"];
  tracking: TrackingContext;
  captureBookings: boolean;
  /** Lets the reveal advance the progress cue to its final step. */
  onSelected?: () => void;
};

const types: AppointmentType[] = ["store_visit", "video_consultation"];

export function AppointmentChooser({ calendly, tracking, captureBookings, onSelected }: Props) {
  const [selected, setSelected] = useState<AppointmentType | null>(null);
  const [booked, setBooked] = useState(false);

  const urlFor = useCallback(
    (type: AppointmentType) =>
      type === "store_visit" ? calendly.storeVisitUrl : calendly.videoConsultationUrl,
    [calendly.storeVisitUrl, calendly.videoConsultationUrl],
  );

  const attribution = useMemo(
    () => ({
      source: tracking.source,
      campaignId: tracking.campaignId,
      productId: tracking.productId,
      reelId: tracking.reelId,
      utmSource: tracking.utmSource,
      utmMedium: tracking.utmMedium,
      utmCampaign: tracking.utmCampaign,
      utmContent: tracking.utmContent,
      utmTerm: tracking.utmTerm,
    }),
    [tracking],
  );

  function select(type: AppointmentType) {
    setSelected(type);
    setBooked(false);
    onSelected?.();
    void trackFunnelEvent(
      type === "store_visit" ? "store_visit_selected" : "video_consultation_selected",
      tracking,
      { appointmentType: type },
    );
  }

  const handleOpened = useCallback(() => {
    if (!selected) return;
    void trackFunnelEvent("calendly_opened", tracking, { appointmentType: selected });
  }, [selected, tracking]);

  const handleBooked = useCallback(
    async (booking: CalendlyBooking) => {
      if (!selected) return;
      setBooked(true);
      if (!captureBookings || !tracking.inquiryId) return;
      try {
        await fetch("/api/appointment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inquiryId: tracking.inquiryId,
            customerId: tracking.customerId,
            sessionId: tracking.sessionId,
            productId: tracking.productId,
            reelId: tracking.reelId,
            campaignId: tracking.campaignId,
            source: tracking.source,
            utmSource: tracking.utmSource,
            utmMedium: tracking.utmMedium,
            utmCampaign: tracking.utmCampaign,
            utmContent: tracking.utmContent,
            utmTerm: tracking.utmTerm,
            landingPageVersion: tracking.landingPageVersion,
            appointmentType: selected,
            eventUri: booking.eventUri,
            inviteeUri: booking.inviteeUri,
            idempotencyKey: `apt:${tracking.sessionId}:${selected}`,
          }),
        });
      } catch {
        // A missed booking record must never disturb a confirmed appointment.
      }
    },
    [captureBookings, selected, tracking],
  );

  const selectedUrl = selected ? urlFor(selected) : undefined;

  return (
    <section className="appointments" aria-labelledby="appointment-heading">
      <h2 id="appointment-heading">Choose your private consultation</h2>
      <div className="appointment-options" role="group" aria-label="Appointment type">
        {types.map((type) => (
          <button
            key={type}
            className={selected === type ? "selected" : ""}
            onClick={() => select(type)}
            type="button"
            aria-pressed={selected === type}
          >
            <span className="option-label">{appointmentCopy[type].label}</span>
            <span className="option-description">{appointmentCopy[type].description}</span>
          </button>
        ))}
      </div>

      <div className="calendly-region">
        {booked ? (
          <p role="status" className="booking-confirmed">
            Your appointment is confirmed. Our team will see you then.
          </p>
        ) : !selected ? (
          <p>Select an appointment type to view availability.</p>
        ) : selectedUrl ? (
          <CalendlyEmbed
            key={selected}
            url={selectedUrl}
            appointmentType={selected}
            attribution={attribution}
            onOpened={handleOpened}
            onBooked={handleBooked}
          />
        ) : (
          <p>Online scheduling is currently unavailable. Please use WhatsApp or request a callback below.</p>
        )}
      </div>
    </section>
  );
}
