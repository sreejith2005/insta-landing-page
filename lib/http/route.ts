import { createRateLimiter } from "@/lib/rate-limit/create-limiter";

const mutationLimiters = {
  lead: createRateLimiter({ limit: 6, windowMs: 60_000, prefix: "ratelimit:lead" }),
  events: createRateLimiter({ limit: 40, windowMs: 60_000, prefix: "ratelimit:events" }),
  /** Read-only, but it proxies a third-party API, so it is bounded too. */
  pincode: createRateLimiter({ limit: 30, windowMs: 60_000, prefix: "ratelimit:pincode" }),
  /** Store PIN guessing: a handful of tries per address every 15 minutes. */
  staffLogin: createRateLimiter({ limit: 8, windowMs: 15 * 60_000, prefix: "ratelimit:staff-login" }),
  staffAction: createRateLimiter({ limit: 60, windowMs: 60_000, prefix: "ratelimit:staff-action" }),
};

function jsonError(status: number, message: string) {
  return Response.json({ ok: false, message }, { status });
}

export class RequestBodyError extends Error {
  constructor(readonly status: 400 | 413) {
    super(status === 413 ? "Request body is too large." : "Request body is invalid.");
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 16_384) throw new RequestBodyError(413);
  try {
    return JSON.parse(body);
  } catch {
    throw new RequestBodyError(400);
  }
}

/**
 * `requireOrigin` is for cookie-authenticated staff routes: a request without
 * an Origin header is refused rather than given the benefit of the doubt.
 */
export function guardMutationRequest(request: Request, options: { requireOrigin?: boolean } = {}): Response | null {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonError(415, "Please send a valid request.");
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > 16_384) return jsonError(413, "This request is too large.");
  const origin = request.headers.get("origin");
  if (!origin && options.requireOrigin) return jsonError(403, "This request could not be verified.");
  const requestUrl = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    requestUrl.host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    requestUrl.protocol.replace(":", "");
  const expectedOrigin = `${protocol}://${host}`;
  if (origin && origin !== expectedOrigin) return jsonError(403, "This request could not be verified.");
  return null;
}

/**
 * Fixed-window limit per client address.
 *
 * `x-forwarded-for` is trusted, so the application must sit behind a proxy
 * that overwrites it (Vercel and equivalent hosts do); if the host merely
 * appends, a client can rotate the header and bypass the limit entirely.
 *
 * The limiter itself is backed by Upstash Redis (`lib/rate-limit/redis.ts`)
 * whenever UPSTASH_REDIS_REST_URL/TOKEN are configured, so limits hold across
 * every serverless instance. Without those variables it falls back to the
 * process-local in-memory limiter, which is only correct for a single dev
 * instance — see `.env.example`.
 */
export async function enforceRateLimit(request: Request, endpoint: keyof typeof mutationLimiters) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const result = await mutationLimiters[endpoint].check(`${endpoint}:${address}`);
  return result.allowed
    ? null
    : Response.json(
        { ok: false, message: "Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
      );
}
