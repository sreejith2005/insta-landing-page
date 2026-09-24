import type { FunnelRepository, StoreVisitAction, StoreVisitRecord } from "@/lib/leads/contracts";
import { logEvent } from "@/lib/log";
import { formatPassDateTime } from "./format";
import { passStatus } from "./status";

/** Who is acting, from the verified staff login. */
export type StaffIdentity = { store: string; staffName: string };

export type StoreVisitInput = {
  passCode: string;
  action: StoreVisitAction;
  /** Required for a purchase. */
  invoiceNumber?: string;
  /** Rupees, required for a purchase. */
  billAmount?: number;
};

export type StoreVisitResult =
  | { ok: true; replay: boolean; visit: StoreVisitRecord }
  | { ok: false; code: "not_found" | "expired" | "already_used" | "missing_invoice"; message: string };

/** A second "visited" tap for the same pass at the same store within this window is the same visit. */
const REPEAT_VISIT_WINDOW_MS = 30 * 60 * 1000;

const sameInvoice = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();

/**
 * Logs a walk-in or a purchase against a pass. A purchase uses the pass up; a
 * retry of the same purchase (same invoice) is recognised and not written
 * twice, so a lost response can safely be retried. Visits never use the pass.
 */
export async function recordStoreVisit(
  input: StoreVisitInput,
  staff: StaffIdentity,
  repository: Pick<FunnelRepository, "findPassByCode" | "listStoreVisits" | "recordStoreVisit">,
  validityDays: number,
  now: Date = new Date(),
): Promise<StoreVisitResult> {
  const pass = await repository.findPassByCode(input.passCode);
  if (!pass) return { ok: false, code: "not_found", message: "No pass found with this code." };

  const status = passStatus(pass, await repository.listStoreVisits(pass.customerId), validityDays, now);
  const log = { passCode: pass.passCode, inquiryId: pass.inquiryId, store: staff.store, action: input.action };

  if (input.action === "purchased") {
    const invoiceNumber = input.invoiceNumber?.trim() ?? "";
    if (!invoiceNumber || !input.billAmount) {
      return { ok: false, code: "missing_invoice", message: "Enter the invoice number and bill amount." };
    }
    if (status.usedBy) {
      if (sameInvoice(status.usedBy.invoiceNumber, invoiceNumber)) {
        logEvent("pass.purchase_replayed", log);
        return { ok: true, replay: true, visit: status.usedBy };
      }
      logEvent("pass.purchase_denied", { ...log, reason: "already_used" });
      return {
        ok: false,
        code: "already_used",
        message: `Already used on ${formatPassDateTime(status.usedBy.createdAt)} at ${status.usedBy.store}.`,
      };
    }
    if (status.state === "expired") {
      logEvent("pass.purchase_denied", { ...log, reason: "expired" });
      return { ok: false, code: "expired", message: "This pass has expired." };
    }
  } else {
    const repeat = status.history.findLast(
      (visit) =>
        visit.action === "visited" &&
        visit.store === staff.store &&
        now.getTime() - Date.parse(visit.createdAt) < REPEAT_VISIT_WINDOW_MS,
    );
    if (repeat) return { ok: true, replay: true, visit: repeat };
  }

  const visit = await repository.recordStoreVisit({
    action: input.action,
    store: staff.store,
    staffName: staff.staffName,
    passCode: pass.passCode,
    customerName: pass.customerName,
    phone: pass.phone,
    inquiryId: pass.inquiryId,
    customerId: pass.customerId,
    productId: pass.productId,
    reelId: pass.reelId,
    campaignId: pass.campaignId,
    invoiceNumber: input.action === "purchased" ? (input.invoiceNumber?.trim() ?? "") : "",
    billAmount: input.action === "purchased" && input.billAmount ? String(input.billAmount) : "",
  });
  logEvent(input.action === "purchased" ? "pass.purchased" : "pass.visited", log);
  return { ok: true, replay: false, visit };
}
