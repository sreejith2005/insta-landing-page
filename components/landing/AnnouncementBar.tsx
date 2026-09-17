import { experienceCopy, offerValidUntil } from "@/config/experience";

/** A real, configured end date only. There is no countdown and no invented deadline. */
function validity(now = new Date()) {
  if (!offerValidUntil) return null;
  const end = new Date(offerValidUntil);
  if (Number.isNaN(end.getTime()) || end < now) return null;
  return `Valid until ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`;
}

export function AnnouncementBar() {
  const until = validity();
  return (
    <aside className="announcement" aria-label="Instagram benefit">
      <p>
        <span className="announcement-mark" aria-hidden="true">◆</span>
        <span className="announcement-title">{experienceCopy.announcement}</span>
        <span className="announcement-sep" aria-hidden="true">·</span>
        <span>{experienceCopy.announcementDetail}</span>
        {until ? (
          <>
            <span className="announcement-sep" aria-hidden="true">·</span>
            <span>{until}</span>
          </>
        ) : null}
      </p>
    </aside>
  );
}
