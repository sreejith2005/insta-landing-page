import { describe, expect, it } from "vitest";

import type { PassRecord, StoreVisitRecord } from "@/lib/leads/contracts";
import { passStatus } from "./status";

const pass: PassRecord = {
  passCode: "MK30-AAAA-BBBB",
  inquiryId: "inq_1",
  customerId: "cus_1",
  issuedAt: "2026-09-24T10:00:00.000+05:30",
  customerName: "Ananya Shah",
  phone: "9876543210",
  city: "Mumbai",
  productId: "MK001",
  productName: "Ring",
  reelId: "R1",
  campaignId: "C1",
};

const visit = (overrides: Partial<StoreVisitRecord>): StoreVisitRecord => ({
  createdAt: "2026-09-27T14:00:00.000+05:30",
  action: "visited",
  store: "Bandra",
  staffName: "Priya",
  passCode: pass.passCode,
  customerName: pass.customerName,
  phone: pass.phone,
  inquiryId: pass.inquiryId,
  customerId: pass.customerId,
  productId: pass.productId,
  reelId: pass.reelId,
  campaignId: pass.campaignId,
  invoiceNumber: "",
  billAmount: "",
  ...overrides,
});

const during = new Date("2026-10-01T10:00:00+05:30");

describe("passStatus", () => {
  it("is valid until its validity runs out, then expired", () => {
    expect(passStatus(pass, [], 60, during).state).toBe("valid");
    expect(passStatus(pass, [], 60, new Date("2026-11-24T10:00:01+05:30")).state).toBe("expired");
  });

  it("stays valid after visits, and is used once purchased", () => {
    const visits = [visit({})];
    expect(passStatus(pass, visits, 60, during)).toMatchObject({ state: "valid", history: visits });
    const purchase = visit({ action: "purchased", invoiceNumber: "INV-1", createdAt: "2026-09-27T16:00:00.000+05:30" });
    const status = passStatus(pass, [...visits, purchase], 60, during);
    expect(status.state).toBe("used");
    expect(status.usedBy).toEqual(purchase);
  });

  it("shows a used pass as used even after it would have expired", () => {
    const purchase = visit({ action: "purchased", invoiceNumber: "INV-1" });
    expect(passStatus(pass, [purchase], 60, new Date("2027-01-01T00:00:00Z")).state).toBe("used");
  });

  it("warns about another of the customer's passes already used, without blocking this one", () => {
    const other = visit({ passCode: "MK30-CCCC-DDDD", action: "purchased", invoiceNumber: "INV-7" });
    const status = passStatus(pass, [other], 60, during);
    expect(status.state).toBe("valid");
    expect(status.otherPassUsed).toEqual(other);
    expect(status.history).toEqual([]);
  });
});
