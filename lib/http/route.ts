import { MemoryRateLimiter } from "@/lib/rate-limit/memory";

const mutationLimiters = {
  lead: new MemoryRateLimiter({ limit: 6, windowMs: 60_000 }),
  callback: new MemoryRateLimiter({ limit: 6, windowMs: 60_000 }),
  appointment: new MemoryRateLimiter({ limit: 10, windowMs: 60_000 }),
  events: new MemoryRateLimiter({ limit: 40, windowMs: 60_000 }),
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

export function guardMutationRequest(request: Request): Response | null {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonError(415, "Please send a valid request.");
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > 16_384) return jsonError(413, "This request is too large.");
  const origin = request.headers.get("origin");
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
 * Two deployment assumptions matter here. `x-forwarded-for` is trusted, so the
 * application must sit behind a proxy that overwrites it (Vercel and equivalent
 * hosts do); if the host merely appends, a client can rotate the header and
 * bypass the limit entirely. And the counters are process-local, so a
 * horizontally scaled deployment multiplies every limit by the instance count.
 * See `docs/PHASE_2.md` for the shared durable limiter this must become.
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
