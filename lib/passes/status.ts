import type { PassRecord, StoreVisitRecord } from "@/lib/leads/contracts";
import { passValidUntil } from "./format";

export type PassState = "valid" | "used" | "expired";

export type PassStatus = {
  state: PassState;
  validUntil: Date;
  /** The purchase that used this pass, when it has been used. */
  usedBy?: StoreVisitRecord;
  /** A purchase on another of this customer's passes: shown to staff as a warning only. */
  otherPassUsed?: StoreVisitRecord;
  /** This pass's own visits and purchases, oldest first. */
  history: StoreVisitRecord[];
};

const byTime = (a: StoreVisitRecord, b: StoreVisitRecord) => Date.parse(a.createdAt) - Date.parse(b.createdAt);

/**
 * Worked out from the Store_Visits rows every time, never stored: a pass is
 * used once it has a "purchased" row, and expired once its validity has run
 * out. Used wins over expired, so staff always see when and where it was used.
 */
export function passStatus(
  pass: PassRecord,
  customerVisits: StoreVisitRecord[],
  validityDays: number,
  now: Date = new Date(),
): PassStatus {
  const history = customerVisits.filter((visit) => visit.passCode === pass.passCode).sort(byTime);
  const usedBy = history.find((visit) => visit.action === "purchased");
  const otherPassUsed = customerVisits
    .filter((visit) => visit.passCode !== pass.passCode && visit.action === "purchased")
    .sort(byTime)
    .at(-1);
  const validUntil = passValidUntil(pass.issuedAt, validityDays);
  const state: PassState = usedBy ? "used" : now.getTime() > validUntil.getTime() ? "expired" : "valid";
  return { state, validUntil, usedBy, otherPassUsed, history };
}
