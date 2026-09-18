import { randomUUID } from "node:crypto";

import { Redis } from "@upstash/redis";

/** Produces the next customer-facing reference, e.g. "MK-2609-0042". Never throws. */
export type ReferenceNumberSource = (date?: Date) => Promise<string>;

/** The one Redis operation the counter needs, so tests can supply a fake. */
export type ReferenceCounter = { incr(key: string): Promise<number> };

/** Months roll over in India Standard Time, matching the sheet timestamps. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function referenceMonth(date: Date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS).toISOString();
  return `${ist.slice(2, 4)}${ist.slice(5, 7)}`;
}

/**
 * The same Upstash connection pattern as the rate limiter: Redis over HTTPS
 * when configured, otherwise nothing (and references fall back to random).
 */
export function redisReferenceCounter(env: {
  upstashUrl?: string;
  upstashToken?: string;
}): ReferenceCounter | undefined {
  if (!env.upstashUrl || !env.upstashToken) return undefined;
  return new Redis({ url: env.upstashUrl, token: env.upstashToken });
}

/**
 * Sequential per-month references from an atomic Redis INCR on `mk:ref:{YYMM}`.
 * If Redis is missing or failing, a random reference is issued instead: a lead
 * must never be lost for want of a pretty number.
 */
export function createReferenceNumberSource(counter?: ReferenceCounter): ReferenceNumberSource {
  return async (date = new Date()) => {
    const month = referenceMonth(date);
    if (counter) {
      try {
        const sequence = await counter.incr(`mk:ref:${month}`);
        return `MK-${month}-${String(sequence).padStart(4, "0")}`;
      } catch (error) {
        console.error("Reference counter unavailable; issuing a random reference.", (error as Error).message);
      }
    }
    return `MK-${month}-${randomUUID().slice(0, 8).toUpperCase()}`;
  };
}
