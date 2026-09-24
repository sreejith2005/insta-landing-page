import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pincode/lookup-pin-code", () => ({
  lookupPinCode: vi.fn().mockResolvedValue({ city: "Mumbai", state: "Maharashtra" }),
}));

import { submitLead } from "@/lib/leads/submit-lead";
import { PreviewRepository } from "@/lib/providers/preview-repository";
import type { LeadSubmissionInput } from "@/lib/validation/schemas";
import { recordStoreVisit } from "./record-store-visit";

vi.spyOn(console, "log").mockImplementation(() => undefined);

const passes = { secret: "test-secret-that-is-long-enough-for-hmac-000", codePrefix: "MK30", validityDays: 60 };
const staff = { store: "Bandra", staffName: "Priya" };

const lead: LeadSubmissionInput = {
  fullName: "Ananya Shah",
  mobileNumber: "9876543210",
  pinCode: "400001",
  city: "Mumbai",
  productId: "MKBR639",
  reelId: "R123",
  campaignId: "RAKHI26",
  source: "instagram",
  sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
  idempotencyKey: "lead:d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4:MKBR639:R123:RAKHI26",
  landingPageVersion: "phase1",
};

async function issued(repository = new PreviewRepository(), input = lead) {
  const result = await submitLead(input, repository, undefined, passes);
  if (!result.ok || !result.pass) throw new Error("no pass issued");
  return { repository, code: result.pass.code, result };
}

describe("submitLead with store passes", () => {
  it("issues one pass per enquiry, stored with the enquiry, and keeps it on replay", async () => {
    const { repository, code, result } = await issued();
    expect(result.pass?.path).toMatch(new RegExp(`^/p/${code}\\.`));
    expect(result.pass?.qrPath).toBe(`${result.pass?.path}/qr?v=2`);
    expect(repository.snapshot().inquiries[0].passCode).toBe(code);
    expect(repository.snapshot().events.map((event) => event.eventName)).toContain("pass_issued");

    const replay = await submitLead(lead, repository, undefined, passes);
    expect(replay.ok && replay.pass?.code).toBe(code);
    expect(repository.snapshot().inquiries).toHaveLength(1);

    const second = await submitLead(
      { ...lead, productId: "RG5073", reelId: "R456", campaignId: "BRIDAL26", idempotencyKey: `${lead.idempotencyKey}:2` },
      repository,
      undefined,
      passes,
    );
    expect(second.ok && second.pass?.code).not.toBe(code);
  });

  it("issues no pass when passes are off", async () => {
    const result = await submitLead(lead, new PreviewRepository());
    expect(result.ok && result.pass).toBeUndefined();
  });
});

describe("recordStoreVisit", () => {
  it("logs a visit without using the pass, and ignores a double tap", async () => {
    const { repository, code } = await issued();
    const first = await recordStoreVisit({ passCode: code, action: "visited" }, staff, repository, 60);
    const again = await recordStoreVisit({ passCode: code, action: "visited" }, staff, repository, 60);
    expect(first).toMatchObject({ ok: true, replay: false });
    expect(again).toMatchObject({ ok: true, replay: true });
    expect(repository.snapshot().storeVisits).toHaveLength(1);
    expect(repository.snapshot().storeVisits[0]).toMatchObject({
      action: "visited",
      store: "Bandra",
      staffName: "Priya",
      passCode: code,
      reelId: "R123",
      campaignId: "RAKHI26",
      productId: "MKBR639",
      customerName: "Ananya Shah",
      invoiceNumber: "",
    });
  });

  it("uses the pass on purchase, treats a retry of the same invoice as done, and refuses a second use", async () => {
    const { repository, code } = await issued();
    const bought = await recordStoreVisit(
      { passCode: code, action: "purchased", invoiceNumber: "INV-1", billAmount: 72000 },
      staff,
      repository,
      60,
    );
    expect(bought).toMatchObject({ ok: true, replay: false });
    expect(repository.snapshot().storeVisits[0]).toMatchObject({ invoiceNumber: "INV-1", billAmount: "72000" });

    const retry = await recordStoreVisit(
      { passCode: code, action: "purchased", invoiceNumber: "inv-1", billAmount: 72000 },
      staff,
      repository,
      60,
    );
    expect(retry).toMatchObject({ ok: true, replay: true });

    const reuse = await recordStoreVisit(
      { passCode: code, action: "purchased", invoiceNumber: "INV-2", billAmount: 5000 },
      { store: "Andheri", staffName: "Rahul" },
      repository,
      60,
    );
    expect(reuse).toMatchObject({ ok: false, code: "already_used" });
    expect(repository.snapshot().storeVisits).toHaveLength(1);
  });

  it("requires the invoice number and bill amount for a purchase", async () => {
    const { repository, code } = await issued();
    const result = await recordStoreVisit({ passCode: code, action: "purchased", invoiceNumber: " " }, staff, repository, 60);
    expect(result).toMatchObject({ ok: false, code: "missing_invoice" });
  });

  it("refuses a purchase on an expired pass but still logs a visit", async () => {
    const { repository, code } = await issued();
    const later = new Date(Date.now() + 61 * 24 * 60 * 60 * 1000);
    const purchase = await recordStoreVisit(
      { passCode: code, action: "purchased", invoiceNumber: "INV-9", billAmount: 100 },
      staff,
      repository,
      60,
      later,
    );
    expect(purchase).toMatchObject({ ok: false, code: "expired" });
    const visit = await recordStoreVisit({ passCode: code, action: "visited" }, staff, repository, 60, later);
    expect(visit).toMatchObject({ ok: true });
  });

  it("reports an unknown code", async () => {
    const result = await recordStoreVisit({ passCode: "MK30-AAAA-AAAA", action: "visited" }, staff, new PreviewRepository(), 60);
    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });
});
