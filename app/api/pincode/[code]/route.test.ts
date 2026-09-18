import { describe, expect, it, vi } from "vitest";

const lookup = vi.hoisted(() => vi.fn());
vi.mock("@/lib/pincode/lookup-pin-code", () => ({ lookupPinCode: lookup }));

import { GET } from "./route";

function get(code: string, ip: string) {
  return GET(new Request(`http://localhost:3000/api/pincode/${code}`, { headers: { "x-forwarded-for": ip } }), {
    params: Promise.resolve({ code }),
  });
}

describe("GET /api/pincode/[code]", () => {
  it("returns the city and state", async () => {
    lookup.mockResolvedValueOnce({ city: "Mumbai", state: "Maharashtra" });
    const response = await get("400001", "203.0.113.31");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, city: "Mumbai", state: "Maharashtra" });
    expect(response.headers.get("cache-control")).toContain("max-age");
  });

  it("404s an unknown PIN", async () => {
    lookup.mockResolvedValueOnce(null);
    expect((await get("999999", "203.0.113.32")).status).toBe(404);
  });

  it("rejects a malformed PIN without calling out", async () => {
    lookup.mockClear();
    expect((await get("0123", "203.0.113.33")).status).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("503s when the directory is unreachable", async () => {
    lookup.mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await get("400001", "203.0.113.34")).status).toBe(503);
  });
});
