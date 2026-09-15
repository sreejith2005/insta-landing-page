import { describe, expect, it } from "vitest";

import { guardMutationRequest, readJsonBody } from "./route";

function request(headers: Record<string, string> = {}) {
  return new Request("https://funnel.example/api/lead", { method: "POST", headers });
}

describe("guardMutationRequest", () => {
  it("rejects non-JSON and oversized requests", () => {
    expect(guardMutationRequest(request({ "content-type": "text/plain" }))?.status).toBe(415);
    expect(guardMutationRequest(request({ "content-type": "application/json", "content-length": "20000" }))?.status).toBe(413);
  });

  it("rejects a cross-origin mutation", () => {
    expect(guardMutationRequest(request({ "content-type": "application/json", origin: "https://evil.example" }))?.status).toBe(403);
  });

  it("accepts same-origin JSON", () => {
    expect(guardMutationRequest(request({ "content-type": "application/json", origin: "https://funnel.example" }))).toBeNull();
  });

  it("uses the forwarded host boundary instead of an internal request URL", () => {
    const proxied = new Request("http://localhost:3000/api/lead", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:3000",
        host: "127.0.0.1:3000",
        "x-forwarded-proto": "http",
      },
    });
    expect(guardMutationRequest(proxied)).toBeNull();
  });

  it("enforces the body limit even when Content-Length is absent", async () => {
    const oversized = new Request("https://funnel.example/api/lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(17_000) }),
    });
    await expect(readJsonBody(oversized)).rejects.toThrow(/too large/i);
  });
});
