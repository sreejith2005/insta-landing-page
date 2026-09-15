"use client";

import { useState } from "react";
import type { PublicProductContext } from "@/types/funnel";
import { trackFunnelEvent, type TrackingContext } from "@/lib/attribution/client-events";

type AppointmentType = "store_visit" | "video_consultation";

export function AppointmentChooser({ calendly, tracking }: { calendly: PublicProductContext["calendly"]; tracking: TrackingContext }) {
  const [selected, setSelected] = useState<AppointmentType | null>(null);
  const url = selected === "store_visit" ? calendly.storeVisitUrl : calendly.videoConsultationUrl;
  function select(type: AppointmentType) {
    setSelected(type);
    void trackFunnelEvent(type === "store_visit" ? "store_visit_selected" : "video_consultation_selected", tracking, { appointmentType: type });
    if ((type === "store_visit" ? calendly.storeVisitUrl : calendly.videoConsultationUrl)) void trackFunnelEvent("calendly_opened", tracking, { appointmentType: type });
  }
  return (
    <section className="appointments" aria-labelledby="appointment-heading">
      <h2 id="appointment-heading">Choose your private consultation</h2>
      <div className="appointment-options">
        <button className={selected === "store_visit" ? "selected" : ""} onClick={() => select("store_visit")} type="button">Store Visit</button>
        <button className={selected === "video_consultation" ? "selected" : ""} onClick={() => select("video_consultation")} type="button">Video Consultation</button>
      </div>
      <div className="calendly-region">
        {!selected ? <p>Select an appointment type to view availability.</p> : url ? (
          <>
            <iframe title={`${selected === "store_visit" ? "Store visit" : "Video consultation"} scheduling`} src={url} loading="lazy" />
            <a href={url} target="_blank" rel="noreferrer">Open scheduling in a new window</a>
          </>
        ) : <p>Online scheduling is currently unavailable. Please use WhatsApp or request a callback below.</p>}
      </div>
    </section>
  );
}
