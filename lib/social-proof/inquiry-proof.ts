import { trustBarConfig, type inquiryProofConfig } from "@/config/experience";
import type { TrustMetric } from "@/config/social-proof";
import type { FunnelRepository, InquiryCountFilter } from "@/lib/leads/contracts";
import type { ProductMapping } from "@/types/funnel";

export type InquiryProofConfig = typeof inquiryProofConfig;
export type TrustBarConfig = typeof trustBarConfig;

/** What the page renders. Contains no product identifiers. */
export type InquiryProof = {
  count: number;
  /** True only for a genuine recent-window measurement explicitly allowed to say LIVE. */
  live: boolean;
  label: string;
};

const HOUR_MS = 3_600_000;

/**
 * Reads the enquiry count for a resolved context straight from the repository.
 * Returns null (proof hidden) when disabled, below threshold, or on failure —
 * the number is never estimated, padded or randomised.
 */
export async function resolveInquiryProof(
  config: InquiryProofConfig,
  repository: Pick<FunnelRepository, "countInquiriesForContext">,
  context: ProductMapping,
  now: Date = new Date(),
): Promise<InquiryProof | null> {
  if (!config.enabled) return null;

  const filter: InquiryCountFilter = { productId: context.productId };
  if (config.scope === "selection") {
    filter.reelId = context.reelId;
    filter.campaignId = context.campaignId;
  }

  const recent = config.mode === "recent";
  const baseline = !recent ? config.auditedBaseline : null;
  if (recent) {
    filter.since = new Date(now.getTime() - config.recentWindowHours * HOUR_MS).toISOString();
  } else if (baseline) {
    if (!Number.isInteger(baseline.count) || baseline.count < 0 || Number.isNaN(Date.parse(baseline.asOf))) {
      return null;
    }
    filter.since = baseline.asOf;
  }

  let count: number;
  try {
    count = await repository.countInquiriesForContext(filter);
  } catch {
    console.error("Inquiry count lookup failed");
    return null;
  }
  if (!Number.isInteger(count) || count < 0) return null;
  if (baseline) count += baseline.count;
  if (count < config.minimumCount) return null;

  const formatted = count.toLocaleString("en-IN");
  if (recent) {
    return config.allowLiveLabel
      ? { count, live: true, label: `${formatted} customers enquiring` }
      : { count, live: false, label: `${formatted} enquiries in the last ${config.recentWindowHours} hours` };
  }
  return { count, live: false, label: `${formatted} enquiries received for this selection` };
}

const CACHE_TTL_MS = 60_000;
const LOOKUP_TIMEOUT_MS = 1_200;
const cache = new Map<string, { value: InquiryProof | null; expiresAt: number }>();

/**
 * Page-facing wrapper: caches each context's proof briefly so a busy Reel does
 * not re-read the Inquiries sheet on every view, and gives up quickly so the
 * hero and form never wait on the count. A slow lookup simply hides the proof.
 */
export async function loadInquiryProof(
  config: InquiryProofConfig,
  repository: Pick<FunnelRepository, "countInquiriesForContext">,
  context: ProductMapping,
): Promise<InquiryProof | null> {
  if (!config.enabled) return null;
  const key = `${config.mode}:${config.recentWindowHours}:${config.allowLiveLabel}:${config.minimumCount}:${config.scope}:${context.productId}:${context.reelId}:${context.campaignId}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), LOOKUP_TIMEOUT_MS);
  });
  const lookup = resolveInquiryProof(config, repository, context);
  const result = await Promise.race([lookup, timeout]);
  clearTimeout(timer);
  if (result === "timeout") {
    // Let the slow lookup finish in the background and warm the cache.
    void lookup.then((value) => cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS }));
    return null;
  }
  cache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

/**
 * Everything the top trust bar renders: the live enquiry count beside the
 * static stats from `config/trust-stats.ts`. The two are displayed together
 * but never combined into one number.
 */
export type TrustBarContent = {
  inquiry: InquiryProof | null;
  stats: readonly TrustMetric[];
  /** True when `stats` are labelled development placeholders. */
  placeholder: boolean;
};

/** Null when there is nothing truthful to show, so the bar is omitted entirely. */
export function resolveTrustBar(
  inquiry: InquiryProof | null,
  stats: readonly TrustMetric[],
  placeholder: boolean,
  config: Pick<TrustBarConfig, "maxStats"> = trustBarConfig,
): TrustBarContent | null {
  const shown = stats.slice(0, config.maxStats);
  if (!inquiry && !shown.length) return null;
  return { inquiry, stats: shown, placeholder: placeholder && shown.length > 0 };
}
