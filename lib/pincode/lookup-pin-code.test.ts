import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearPinCodeCache, locationFromResponse, lookupPinCode } from "./lookup-pin-code";

const found = [
  {
    Message: "Number of pincode(s) found:1",
    Status: "Success",
    PostOffice: [{ Name: "Fort", District: "Mumbai", State: "Maharashtra" }],
  },
];
const missing = [{ Message: "No records found", Status: "Error", PostOffice: null }];

describe("locationFromResponse", () => {
  it("reads the district as the city and the state", () => {
    expect(locationFromResponse(found)).toEqual({ city: "Mumbai", state: "Maharashtra" });
  });

  it("returns null for an unknown PIN", () => {
    expect(locationFromResponse(missing)).toBeNull();
  });

  it("throws on an unexpected shape so callers treat it as an outage", () => {
    expect(() => locationFromResponse({ error: "oops" })).toThrow();
  });
});

describe("lookupPinCode", () => {
  beforeEach(() => clearPinCodeCache());
  afterEach(() => vi.unstubAllGlobals());

  it("queries India Post once and serves repeats from cache", async () => {
    const fetchSpy = vi.fn().mockImplementation(() => Promise.resolve(Response.json(found)));
    vi.stubGlobal("fetch", fetchSpy);
    expect(await lookupPinCode("400001")).toEqual({ city: "Mumbai", state: "Maharashtra" });
    expect(await lookupPinCode("400001")).toEqual({ city: "Mumbai", state: "Maharashtra" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://api.postalpincode.in/pincode/400001");
  });

  it("never calls out for a malformed PIN", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await lookupPinCode("../x")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws when the directory is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 502 })));
    await expect(lookupPinCode("400001")).rejects.toThrow();
  });
});
