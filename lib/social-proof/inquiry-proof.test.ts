import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { inquiryProofConfig } from "@/config/experience";
import { resolveInquiryProof, type InquiryProofConfig } from "./inquiry-proof";

const context = { productId: "MKBR639", reelId: "R123", campaignId: "RAKHI26" };
const now = new Date("2026-09-17T12:00:00.000Z");

function config(overrides: Partial<InquiryProofConfig> = {}): InquiryProofConfig {
  return { ...inquiryProofConfig, enabled: true, minimumCount: 10, ...overrides };
}

function repo(count: number | Error) {
  return {
    countInquiriesForContext: vi.fn(async () => {
      if (count instanceof Error) throw count;
      return count;
    }),
  };
}

describe("resolveInquiryProof", () => {
  it("returns the exact repository count for the full selection in total mode", async () => {
    const repository = repo(5347);
    const proof = await resolveInquiryProof(config(), repository, context, now);
    expect(proof).toEqual({ count: 5347, live: false, label: "5,347 enquiries received for this selection" });
    expect(repository.countInquiriesForContext).toHaveBeenCalledWith({
      productId: "MKBR639",
      reelId: "R123",
      campaignId: "RAKHI26",
    });
  });

  it("hides a zero count", async () => {
    expect(await resolveInquiryProof(config({ minimumCount: 1 }), repo(0), context, now)).toBeNull();
  });

  it("hides counts below the configured minimum instead of inflating them", async () => {
    expect(await resolveInquiryProof(config({ minimumCount: 10 }), repo(7), context, now)).toBeNull();
  });

  it("hides the proof when disabled or when the lookup fails", async () => {
    const repository = repo(500);
    expect(await resolveInquiryProof(config({ enabled: false }), repository, context, now)).toBeNull();
    expect(repository.countInquiriesForContext).not.toHaveBeenCalled();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await resolveInquiryProof(config(), repo(new Error("sheets down")), context, now)).toBeNull();
  });

  it("never shows LIVE for a total count, even if the flag is set", async () => {
    const proof = await resolveInquiryProof(config({ allowLiveLabel: true }), repo(40), context, now);
    expect(proof?.live).toBe(false);
  });

  it("uses a recent window and shows LIVE only when explicitly allowed", async () => {
    const repository = repo(42);
    const hidden = await resolveInquiryProof(
      config({ mode: "recent", recentWindowHours: 24 }),
      repository,
      context,
      now,
    );
    expect(hidden).toEqual({ count: 42, live: false, label: "42 enquiries in the last 24 hours" });
    expect(repository.countInquiriesForContext).toHaveBeenCalledWith(
      expect.objectContaining({ since: "2026-09-16T12:00:00.000Z" }),
    );
    const live = await resolveInquiryProof(
      config({ mode: "recent", allowLiveLabel: true }),
      repo(42),
      context,
      now,
    );
    expect(live).toEqual({ count: 42, live: true, label: "42 customers enquiring" });
  });

  it("widens to the product scope without reel or campaign filters", async () => {
    const repository = repo(12);
    await resolveInquiryProof(config({ scope: "product" }), repository, context, now);
    expect(repository.countInquiriesForContext).toHaveBeenCalledWith({ productId: "MKBR639" });
  });

  it("adds an approved audited baseline only to inquiries created after it", async () => {
    const repository = repo(3);
    const proof = await resolveInquiryProof(
      config({ auditedBaseline: { count: 1200, asOf: "2026-09-01T00:00:00.000Z", approvalReference: "MKJ-1" } }),
      repository,
      context,
      now,
    );
    expect(proof?.count).toBe(1203);
    expect(repository.countInquiriesForContext).toHaveBeenCalledWith(
      expect.objectContaining({ since: "2026-09-01T00:00:00.000Z" }),
    );
  });
});

describe("no fabricated activity", () => {
  it("does not use random number generation anywhere in customer-facing code", () => {
    const roots = ["app", "components", "config", "lib/social-proof"];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
          if (/Math\.random/.test(readFileSync(path, "utf8"))) offenders.push(path);
        }
      }
    };
    roots.forEach(walk);
    expect(offenders).toEqual([]);
  });
});
