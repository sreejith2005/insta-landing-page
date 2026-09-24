import { describe, expect, it, vi } from "vitest";

import type { LeadSubmissionInput } from "@/lib/validation/schemas";

import {
  columnLetter,
  countMatchingInquiries,
  defaultHeaders,
  fmsDateOnly,
  fmsDateTime,
  fmsPhone,
  fmsSourceLabels,
  GoogleSheetsRepository,
  headerRecord,
  inquiryById,
  latestInquiryForContact,
  productFromMap,
  productFromRow,
  productsForReel,
  type Row,
  sheetTimestamp,
} from "./google-sheets-repository";

describe("Google Sheets flat Product_Master mapping", () => {
  it("maps headers independently of column order", () => {
    expect(
      headerRecord(
        ["campaign_id", "product_id", "active_status"],
        ["RAKHI26", "MK001", "true"],
      ),
    ).toEqual({ campaign_id: "RAKHI26", product_id: "MK001", active_status: "true" });
  });

  it("parses the attribution tuple plus image and booking links, but no catalogue fields", () => {
    const record = productFromRow({
      product_id: "MK001",
      product_name: "Internal reporting name",
      reel_id: "R101",
      campaign_id: "RAKHI26",
      product_position: "2",
      active_status: "TRUE",
      category: "Bracelet",
      collection: "Rakhi 2026",
      campaign_name: "Rakhi Offer",
      image_url: " https://example.test/mk001.jpg ",
      calendly_store_url: "https://calendly.com/mkjewels/store",
      calendly_video_url: "",
      specifications_json: '[{"label":"Purity","value":"18K"}]',
      price: "999",
    });

    expect(record).toEqual({
      productId: "MK001",
      productName: "Internal reporting name",
      reelId: "R101",
      campaignId: "RAKHI26",
      productPosition: 2,
      active: true,
      category: "Bracelet",
      collection: "Rakhi 2026",
      campaignName: "Rakhi Offer",
      imageUrl: "https://example.test/mk001.jpg",
      calendlyStoreUrl: "https://calendly.com/mkjewels/store",
      calendlyVideoUrl: undefined,
    });
    expect(record).toHaveProperty("calendlyVideoUrl", undefined);
    expect(JSON.stringify(record)).not.toMatch(/specification|price|999/i);
  });

  it("rejects rows missing any member of the authoritative tuple", () => {
    expect(
      productFromRow({
        product_id: "MK001",
        product_name: "Name",
        reel_id: "R101",
        campaign_id: "",
        active_status: "TRUE",
      }),
    ).toBeNull();
  });

  it("documents only the flat mapping and active operational write columns", () => {
    expect(defaultHeaders.products).toEqual([
      "product_id",
      "product_name",
      "reel_id",
      "campaign_id",
      "product_position",
      "active_status",
      "category",
      "collection",
      "campaign_name",
    ]);
    expect(defaultHeaders.inquiries).toContain("product_name");
    expect(defaultHeaders.inquiries).toContain("idempotency_key");
    expect(defaultHeaders.customers).toContain("phone_normalized");
    expect(defaultHeaders).not.toHaveProperty("reelProductMap");
    expect(defaultHeaders).not.toHaveProperty("callbacks");
  });
});

describe("countMatchingInquiries", () => {
  const rows = [
    {
      product_id: "MK001",
      reel_id: "R101",
      campaign_id: "RAKHI26",
      created_at: "2026-09-01T00:00:00.000Z",
    },
    {
      product_id: "MK001",
      reel_id: "R102",
      campaign_id: "RAKHI26",
      created_at: "2026-09-10T00:00:00.000Z",
    },
    {
      product_id: "MK001",
      reel_id: "R101",
      campaign_id: "BRIDAL26",
      created_at: "not-a-date",
    },
    {
      product_id: "MK002",
      reel_id: "R101",
      campaign_id: "RAKHI26",
      created_at: "2026-09-12T00:00:00.000Z",
    },
  ];

  it("counts product-only, campaign, exact tuple, and recent-window matches", () => {
    expect(countMatchingInquiries(rows, { productId: "MK001" })).toBe(3);
    expect(
      countMatchingInquiries(rows, { productId: "MK001", campaignId: "RAKHI26" }),
    ).toBe(2);
    expect(
      countMatchingInquiries(rows, {
        productId: "MK001",
        reelId: "R101",
        campaignId: "RAKHI26",
      }),
    ).toBe(1);
    expect(
      countMatchingInquiries(rows, {
        productId: "MK001",
        campaignId: "RAKHI26",
        since: "2026-09-05T00:00:00.000Z",
      }),
    ).toBe(1);
  });

  it("does not include malformed dates in a windowed count", () => {
    expect(
      countMatchingInquiries(rows, {
        productId: "MK001",
        campaignId: "BRIDAL26",
        since: "2026-09-01T00:00:00.000Z",
      }),
    ).toBe(0);
  });
});

describe("Reel_Product_Map resolution", () => {
  const products = [
    {
      product_id: "MKTEST001",
      product_name: "Test Bracelet",
      reel_id: "REEL001",
      campaign_id: "TESTCAMPAIGN",
      product_position: "1",
      active_status: "TRUE",
      category: "Bracelet",
      collection: "Test Collection",
      campaign_name: "Test Campaign",
    },
  ];
  const map = [
    { reel_id: "REEL001", campaign_id: "TESTCAMPAIGN", product_position: "1", product_id: "MKTEST001", active_status: "TRUE" },
    { reel_id: "REEL002", campaign_id: "DIWALI26", product_position: "3", product_id: "MKTEST001", active_status: "TRUE" },
    { reel_id: "REEL003", campaign_id: "DIWALI26", product_position: "1", product_id: "MKTEST001", active_status: "FALSE" },
    { reel_id: "", campaign_id: "", product_position: "", product_id: "", active_status: "  " },
  ];

  it("joins the exact mapping row with the product's attribution fields", () => {
    expect(productFromMap(products, map, { productId: "MKTEST001", reelId: "REEL001", campaignId: "TESTCAMPAIGN" })).toEqual({
      productId: "MKTEST001",
      productName: "Test Bracelet",
      reelId: "REEL001",
      campaignId: "TESTCAMPAIGN",
      productPosition: 1,
      active: true,
      category: "Bracelet",
      collection: "Test Collection",
      campaignName: "Test Campaign",
    });
  });

  it("lets one product appear in several Reels with each mapping's own position", () => {
    const record = productFromMap(products, map, { productId: "MKTEST001", reelId: "REEL002", campaignId: "DIWALI26" });
    expect(record).toMatchObject({ reelId: "REEL002", campaignId: "DIWALI26", productPosition: 3, active: true });
  });

  it("does not resolve unmapped tuples, tampered products, or products missing from Products", () => {
    expect(productFromMap(products, map, { productId: "MKTEST001", reelId: "REEL001", campaignId: "DIWALI26" })).toBeNull();
    expect(productFromMap(products, map, { productId: "OTHER", reelId: "REEL001", campaignId: "TESTCAMPAIGN" })).toBeNull();
    expect(productFromMap([], map, { productId: "MKTEST001", reelId: "REEL001", campaignId: "TESTCAMPAIGN" })).toBeNull();
    expect(productFromMap(products, map, { productId: "", reelId: "", campaignId: "" })).toBeNull();
  });

  it("is inactive when either the mapping or the product is switched off", () => {
    expect(productFromMap(products, map, { productId: "MKTEST001", reelId: "REEL003", campaignId: "DIWALI26" })?.active).toBe(false);
    const inactiveProduct = [{ ...products[0], active_status: "FALSE" }];
    expect(productFromMap(inactiveProduct, map, { productId: "MKTEST001", reelId: "REEL001", campaignId: "TESTCAMPAIGN" })?.active).toBe(false);
  });

  describe("productsForReel", () => {
    const catalogue: Row[] = [
      { product_id: "RG1", product_name: "Solitaire", image_url: "https://cdn.example.com/rg1.jpg" },
      { product_id: "RG2", product_name: "Halo", active_status: "TRUE" },
      { product_id: "RG3", product_name: "Switched-off product", active_status: "FALSE" },
      { product_id: "RG4", product_name: "Switched-off mapping" },
      { product_id: "RG6", product_name: "Other Reel" },
    ];
    const reelMap = [
      { reel_id: "R456", campaign_id: "BRIDAL26", product_position: "2", product_id: "RG1", active_status: "TRUE" },
      { reel_id: "R456", campaign_id: "BRIDAL26", product_position: "1", product_id: "RG2", active_status: "yes" },
      { reel_id: "R456", campaign_id: "BRIDAL26", product_position: "3", product_id: "RG3", active_status: "TRUE" },
      { reel_id: "R456", campaign_id: "BRIDAL26", product_position: "4", product_id: "RG4", active_status: "FALSE" },
      { reel_id: "R456", campaign_id: "BRIDAL26", product_position: "5", product_id: "RG5", active_status: "TRUE" },
      { reel_id: "R456", campaign_id: "BRIDAL26", product_position: "2", product_id: "RG1", active_status: "TRUE" },
      { reel_id: "R456", campaign_id: "DIWALI26", product_position: "1", product_id: "RG6", active_status: "TRUE" },
      { reel_id: "R999", campaign_id: "BRIDAL26", product_position: "1", product_id: "RG6", active_status: "TRUE" },
    ];
    const reel = { reelId: "R456", campaignId: "BRIDAL26" };

    it("lists each active, catalogued product once, in product_position order", () => {
      expect(productsForReel(catalogue, reelMap, reel).map((record) => record.productId)).toEqual(["RG2", "RG1"]);
    });

    it("returns exactly the record a link naming each product would resolve to", () => {
      for (const record of productsForReel(catalogue, reelMap, reel)) {
        expect(record).toEqual(productFromMap(catalogue, reelMap, { ...reel, productId: record.productId }));
      }
      expect(productsForReel(catalogue, reelMap, reel)[1].imageUrl).toBe("https://cdn.example.com/rg1.jpg");
    });

    it("is empty for an unknown Reel or campaign", () => {
      expect(productsForReel(catalogue, reelMap, { reelId: "R000", campaignId: "BRIDAL26" })).toEqual([]);
      expect(productsForReel(catalogue, reelMap, { reelId: "R456", campaignId: "NONE" })).toEqual([]);
    });
  });

  it("documents the map tab's canonical headers", () => {
    expect(defaultHeaders.reelMap).toEqual(["reel_id", "campaign_id", "product_position", "product_id", "active_status"]);
  });
});

describe("sheetTimestamp", () => {
  it("writes India Standard Time that still parses to the same instant", () => {
    const instant = new Date("2026-09-17T14:13:04.488Z");
    expect(sheetTimestamp(instant)).toBe("2026-09-17T19:43:04.488+05:30");
    expect(Date.parse(sheetTimestamp(instant))).toBe(instant.getTime());
  });

  it("keeps recent-window counting correct across UTC and IST rows", () => {
    const rows = [
      { product_id: "MK001", reel_id: "R1", campaign_id: "C1", created_at: "2026-09-17T14:13:04.488Z" },
      { product_id: "MK001", reel_id: "R1", campaign_id: "C1", created_at: "2026-09-17T19:43:05.000+05:30" },
      { product_id: "MK001", reel_id: "R1", campaign_id: "C1", created_at: "2026-09-17T19:00:00.000+05:30" },
    ];
    expect(countMatchingInquiries(rows, { productId: "MK001", reelId: "R1", campaignId: "C1", since: "2026-09-17T14:00:00.000Z" })).toBe(2);
  });
});

describe("Instagram FMS formatters", () => {
  it("writes IST as DD/MM/YYYY HH:MM:SS with no milliseconds or zone", () => {
    expect(fmsDateTime(new Date("2026-09-18T12:55:37.912Z"))).toBe("18/09/2026 18:25:37");
    expect(fmsDateTime(new Date("2026-01-04T21:05:09.000Z"))).toBe("05/01/2026 02:35:09");
  });

  it("writes the IST calendar date, rolling over past midnight IST", () => {
    expect(fmsDateOnly(new Date("2026-09-18T12:55:37.000Z"))).toBe("18/09/2026");
    expect(fmsDateOnly(new Date("2026-09-18T18:45:00.000Z"))).toBe("19/09/2026");
  });

  it("reduces phone numbers to plain 10 digits", () => {
    expect(fmsPhone("9978621605")).toBe("9978621605");
    expect(fmsPhone("+919978621605")).toBe("9978621605");
    expect(fmsPhone("+91 99786 21605")).toBe("9978621605");
    expect(fmsPhone("919978621605")).toBe("9978621605");
    // A 10-digit number that begins with 91 is not a country code.
    expect(fmsPhone("9123456789")).toBe("9123456789");
  });

  it("labels every funnel source", () => {
    expect(fmsSourceLabels).toEqual({
      instagram: "Direct Message",
      manychat: "Direct Message",
      whatsapp: "WhatsApp",
      direct: "Direct",
    });
  });
});

describe("GoogleSheetsRepository Instagram FMS dual-write", () => {
  const sheets = {
    products: "Products",
    reelMap: undefined,
    customers: "Customers",
    inquiries: "Inquiries",
    events: "Events",
    instagramFms: "Instagram_FMS" as string | undefined,
    bookings: "Bookings",
    storeVisits: "Store_Visits",
    stores: "Stores",
  };
  const headerRows: Record<string, string[][]> = {
    Customers: [[...defaultHeaders.customers]],
    Inquiries: [[...defaultHeaders.inquiries]],
    Instagram_FMS: [[...defaultHeaders.instagramFms]],
  };
  const lead: LeadSubmissionInput = {
    fullName: "Ananya Shah",
    mobileNumber: "9876543210",
    pinCode: "400001",
    city: "Mumbai",
    state: "Maharashtra",
    productId: "MK001",
    reelId: "R101",
    campaignId: "RAKHI26",
    source: "manychat",
    instagramUsername: "ananya.s",
    dmReceivedAt: "2026-09-17T14:13:04.000Z",
    sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
    idempotencyKey: "lead:d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4:MK001:R101:RAKHI26",
    landingPageVersion: "phase1",
  };
  const product = {
    productId: "MK001",
    productName: "Internal name",
    reelId: "R101",
    campaignId: "RAKHI26",
    imageUrl: "https://cdn.example.com/mk001.jpg",
  };

  function repositoryWith(options: { fmsTab?: string; failTab?: string } = { fmsTab: "Instagram_FMS" }) {
    const appended: { tab: string; row: Record<string, string> }[] = [];
    const tabOf = (range: string) => /^'(.*)'!/.exec(range)![1];
    const client = {
      spreadsheets: {
        values: {
          get: vi.fn(async ({ range }: { range: string }) => ({ data: { values: headerRows[tabOf(range)] ?? [] } })),
          append: vi.fn(async ({ range, requestBody }: { range: string; requestBody: { values: string[][] } }) => {
            const tab = tabOf(range);
            if (tab === options.failTab) throw new Error("Sheets unavailable");
            appended.push({ tab, row: headerRecord(headerRows[tab][0], requestBody.values[0]) });
            return {};
          }),
        },
      },
    };
    const repository = new GoogleSheetsRepository(
      {
        serviceAccountEmail: "svc@example.iam.gserviceaccount.com",
        privateKey: "test-key",
        spreadsheetId: "sheet-id",
        sheets: { ...sheets, instagramFms: options.fmsTab },
      },
      { referenceNumber: async () => "MK-2609-0042" },
    );
    Object.assign(repository, { client });
    return { repository, appended };
  }

  it("appends an FMS row keyed by the team's exact headers after the inquiry", async () => {
    const { repository, appended } = repositoryWith();
    await repository.acceptLead(lead, product);

    expect(appended.map(({ tab }) => tab)).toEqual(["Customers", "Inquiries", "Instagram_FMS"]);
    const fms = appended[2].row;
    expect(fms).toMatchObject({
      "REFERENCE NUMBER": "MK-2609-0042",
      "DM RECEIVED DATE": "17/09/2026",
      "ASSIGNED BY": "",
      "CUSTOMER NAME": "Ananya Shah",
      "INSTAGRAM ID": "ananya.s",
      "CUSTOMER CONTACT NUMBER": "9876543210",
      ADDRESS: "",
      CITY: "Mumbai",
      STATE: "Maharashtra",
      "PIN CODE": "400001",
      "SOURCE OF THE LEAD": "Direct Message",
      "PRODUCT NUMBER": "MK001",
      PRICING: "",
      IMAGE: "https://cdn.example.com/mk001.jpg",
    });
    // Same instant as the inquiry, in the FMS format; Inquiries keeps ISO.
    const inquiry = appended[1].row;
    expect(inquiry.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+05:30$/);
    expect(fms.Timestamp).toBe(fmsDateTime(new Date(inquiry.created_at)));
    expect(inquiry.source).toBe("manychat");
    // The same reference is kept on Inquiries, so a booking can find it by inquiry ID.
    expect(inquiry.reference_number).toBe("MK-2609-0042");
    expect(inquiry.inquiry_id).toMatch(/^inq_/);
  });

  it("keeps the FMS tab at exactly the team's 15 headers plus BENEFIT CODE", () => {
    expect(defaultHeaders.instagramFms).toHaveLength(16);
    expect(defaultHeaders.instagramFms.at(-1)).toBe("BENEFIT CODE");
    expect(defaultHeaders.instagramFms).not.toContain("reference_number");
    expect(defaultHeaders.instagramFms.some((header) => /booking|scheduled|calendly/i.test(header))).toBe(false);
  });

  it("keeps the reference on Inquiries even when the FMS write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { repository, appended } = repositoryWith({ fmsTab: "Instagram_FMS", failTab: "Instagram_FMS" });
    await repository.acceptLead(lead, product);
    expect(appended[1].row.reference_number).toBe("MK-2609-0042");
  });

  it("keeps Inquiries' phone as-is and writes a 10-digit number to FMS", async () => {
    const { repository, appended } = repositoryWith();
    await repository.acceptLead({ ...lead, mobileNumber: "+919978621605" }, product);
    expect(appended[1].row.phone_normalized).toBe("+919978621605");
    expect(appended[2].row["CUSTOMER CONTACT NUMBER"]).toBe("9978621605");
  });

  it("falls back to the lead's date when no DM time was captured", async () => {
    const { repository, appended } = repositoryWith();
    await repository.acceptLead({ ...lead, dmReceivedAt: undefined }, product);
    const fms = appended[2].row;
    expect(fms["DM RECEIVED DATE"]).toBe(fms.Timestamp.slice(0, 10));
  });

  it("still accepts the lead when the FMS write fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { repository, appended } = repositoryWith({ fmsTab: "Instagram_FMS", failTab: "Instagram_FMS" });
    const accepted = await repository.acceptLead(lead, product);

    expect(accepted).toMatchObject({ wasReplay: false, isRepeatCustomer: false });
    expect(appended.map(({ tab }) => tab)).toEqual(["Customers", "Inquiries"]);
    expect(error).toHaveBeenCalledWith("Instagram FMS write failed", expect.objectContaining({ inquiryId: accepted.inquiryId }));
    // No PII in the log line.
    expect(JSON.stringify(error.mock.calls)).not.toContain("9876543210");
  });

  it("skips the FMS write when the tab is not configured", async () => {
    const { repository, appended } = repositoryWith({ fmsTab: undefined });
    await repository.acceptLead(lead, product);
    expect(appended.map(({ tab }) => tab)).toEqual(["Customers", "Inquiries"]);
  });
});

describe("latestInquiryForContact", () => {
  const rows: Row[] = [
    { phone_normalized: "9876543210", product_id: "MK001", reel_id: "R1", campaign_id: "C1", created_at: "2026-09-10T10:00:00.000+05:30" },
    {
      inquiry_id: "inq_2",
      reference_number: "MK-2609-0002",
      phone_normalized: "9876543210",
      product_id: "MK002",
      reel_id: "R2",
      campaign_id: "C2",
      created_at: "2026-09-12T10:00:00.000+05:30",
    },
    { phone_normalized: "9876543210", product_id: "MK003", reel_id: "R3", campaign_id: "C3", created_at: "2026-09-11T10:00:00.000+05:30" },
    { phone_normalized: "9123456789", product_id: "MK004", reel_id: "R4", campaign_id: "C4", created_at: "2026-09-15T10:00:00.000+05:30" },
  ];

  it("returns the most recent inquiry for a matching phone", () => {
    expect(latestInquiryForContact(rows, { email: "a@example.com", phones: ["9876543210"] })).toEqual({
      inquiryId: "inq_2",
      referenceNumber: "MK-2609-0002",
      productId: "MK002",
      reelId: "R2",
      campaignId: "C2",
    });
  });

  it("matches an email column case-insensitively when the tab has one", () => {
    const withEmail = [
      ...rows,
      { email: "Ananya@Example.com", product_id: "MK005", reel_id: "R5", campaign_id: "C5", created_at: "2026-09-01T00:00:00Z" },
    ];
    expect(latestInquiryForContact(withEmail, { email: "ananya@example.com", phones: [] })?.productId).toBe("MK005");
  });

  it("returns null without a match", () => {
    expect(latestInquiryForContact(rows, { email: "x@example.com", phones: ["9000000001"] })).toBeNull();
    expect(latestInquiryForContact(rows, { phones: [] })).toBeNull();
  });
});

describe("inquiryById", () => {
  const rows = [
    { inquiry_id: "inq_1", reference_number: "MK-2609-0001", product_id: "MK001", reel_id: "R1", campaign_id: "C1" },
    { inquiry_id: " inq_2 ", reference_number: "", product_id: "MK002", reel_id: "R2", campaign_id: "C2" },
  ];

  it("finds the inquiry and its reference number by ID", () => {
    expect(inquiryById(rows, "inq_1")).toEqual({
      inquiryId: "inq_1",
      referenceNumber: "MK-2609-0001",
      productId: "MK001",
      reelId: "R1",
      campaignId: "C1",
    });
  });

  it("gives a blank reference for inquiries logged before it was stored", () => {
    expect(inquiryById(rows, "inq_2")).toMatchObject({ inquiryId: "inq_2", referenceNumber: "", productId: "MK002" });
  });

  it("returns null for an unknown ID", () => {
    expect(inquiryById(rows, "inq_9")).toBeNull();
  });
});

describe("GoogleSheetsRepository bookings", () => {
  it("appends a Bookings row once per Calendly invitee", async () => {
    const tabs: Record<string, string[][]> = { Bookings: [[...defaultHeaders.bookings]] };
    const tabOf = (range: string) => /^'(.*)'!/.exec(range)![1];
    const client = {
      spreadsheets: {
        values: {
          get: vi.fn(async ({ range }: { range: string }) => ({ data: { values: tabs[tabOf(range)] ?? [] } })),
          append: vi.fn(async ({ range, requestBody }: { range: string; requestBody: { values: string[][] } }) => {
            tabs[tabOf(range)].push(requestBody.values[0]);
            return {};
          }),
        },
      },
    };
    const repository = new GoogleSheetsRepository({
      serviceAccountEmail: "svc@example.iam.gserviceaccount.com",
      privateKey: "test-key",
      spreadsheetId: "sheet-id",
      sheets: {
        products: "Products",
        reelMap: undefined,
        customers: "Customers",
        inquiries: "Inquiries",
        events: "Events",
        instagramFms: undefined,
        bookings: "Bookings",
        storeVisits: "Store_Visits",
        stores: "Stores",
      },
    });
    Object.assign(repository, { client });
    const booking = {
      bookingType: "video_call" as const,
      scheduledStart: "2026-09-20T05:30:00.000000Z",
      scheduledEnd: "2026-09-20T06:00:00Z",
      inviteeName: "Ananya Shah",
      inviteeEmail: "ananya@example.com",
      inviteeUri: "https://api.calendly.com/scheduled_events/E1/invitees/I1",
      attribution: {
        inquiryId: "inq_1",
        referenceNumber: "MK-2609-0042",
        productId: "MK001",
        reelId: "R1",
        campaignId: "C1",
      },
    };

    expect(await repository.recordBooking(booking)).toEqual({ wasReplay: false });
    expect(await repository.recordBooking(booking)).toEqual({ wasReplay: true });
    expect(tabs.Bookings).toHaveLength(2);
    expect(headerRecord([...defaultHeaders.bookings], tabs.Bookings[1])).toMatchObject({
      booking_type: "video_call",
      scheduled_start: "2026-09-20T11:00:00.000+05:30",
      scheduled_end: "2026-09-20T11:30:00.000+05:30",
      invitee_name: "Ananya Shah",
      invitee_email: "ananya@example.com",
      product_id: "MK001",
      reel_id: "R1",
      campaign_id: "C1",
      calendly_invitee_uri: booking.inviteeUri,
      reference_number: "MK-2609-0042",
    });
  });

  it("leaves reference_number blank for a booking it could not join", async () => {
    const tabs: Record<string, string[][]> = { Bookings: [[...defaultHeaders.bookings]] };
    const client = {
      spreadsheets: {
        values: {
          get: vi.fn(async () => ({ data: { values: tabs.Bookings } })),
          append: vi.fn(async ({ requestBody }: { requestBody: { values: string[][] } }) => {
            tabs.Bookings.push(requestBody.values[0]);
            return {};
          }),
        },
      },
    };
    const repository = new GoogleSheetsRepository({
      serviceAccountEmail: "svc@example.iam.gserviceaccount.com",
      privateKey: "test-key",
      spreadsheetId: "sheet-id",
      sheets: {
        products: "Products",
        reelMap: undefined,
        customers: "Customers",
        inquiries: "Inquiries",
        events: "Events",
        instagramFms: undefined,
        bookings: "Bookings",
        storeVisits: "Store_Visits",
        stores: "Stores",
      },
    });
    Object.assign(repository, { client });
    await repository.recordBooking({
      bookingType: "unknown",
      scheduledStart: "2026-09-20T05:30:00Z",
      scheduledEnd: "2026-09-20T06:00:00Z",
      inviteeName: "Walk-in",
      inviteeEmail: "walkin@example.com",
      inviteeUri: "https://api.calendly.com/scheduled_events/E2/invitees/I2",
      attribution: null,
    });
    expect(headerRecord([...defaultHeaders.bookings], tabs.Bookings[1])).toMatchObject({
      product_id: "",
      reference_number: "",
    });
  });
});

describe("GoogleSheetsRepository store passes", () => {
  const sheets = {
    products: "Products",
    reelMap: undefined,
    customers: "Customers",
    inquiries: "Inquiries",
    events: "Events",
    instagramFms: "Instagram_FMS",
    bookings: "Bookings",
    storeVisits: "Store_Visits",
    stores: "Stores",
  };
  const lead: LeadSubmissionInput = {
    fullName: "Ananya Shah",
    mobileNumber: "9876543210",
    pinCode: "400001",
    city: "Mumbai",
    productId: "MK001",
    reelId: "R101",
    campaignId: "RAKHI26",
    source: "instagram",
    sessionId: "d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4",
    idempotencyKey: "lead:d17d3694-e88b-42b1-a7ae-f4c4f5f32ef4:MK001:R101:RAKHI26",
    landingPageVersion: "phase1",
  };
  const product = { productId: "MK001", productName: "Internal name", reelId: "R101", campaignId: "RAKHI26" };

  /** A fake sheet whose tabs hold header rows (and appended rows) in memory. */
  function fakeSheet(tabs: Record<string, string[][]>) {
    const tabOf = (range: string) => /^'(.*)'!/.exec(range)![1];
    const updates: { range: string; values: string[][] }[] = [];
    const client = {
      spreadsheets: {
        values: {
          get: vi.fn(async ({ range }: { range: string }) => {
            const rows = tabs[tabOf(range)] ?? [];
            return { data: { values: range.endsWith("!1:1") ? rows.slice(0, 1) : rows } };
          }),
          append: vi.fn(async ({ range, requestBody }: { range: string; requestBody: { values: string[][] } }) => {
            (tabs[tabOf(range)] ??= []).push(requestBody.values[0]);
            return {};
          }),
          update: vi.fn(async ({ range, requestBody }: { range: string; requestBody: { values: string[][] } }) => {
            updates.push({ range, values: requestBody.values });
            const rows = (tabs[tabOf(range)] ??= [[]]);
            rows[0] = [...(rows[0] ?? []), ...requestBody.values[0]];
            return {};
          }),
        },
      },
    };
    const repository = new GoogleSheetsRepository(
      { serviceAccountEmail: "svc@example.iam.gserviceaccount.com", privateKey: "test-key", spreadsheetId: "sheet-id", sheets },
      { referenceNumber: async () => "MK-2609-0042" },
    );
    Object.assign(repository, { client });
    const rowsOf = (tab: string) => {
      const [headers = [], ...rows] = tabs[tab] ?? [];
      return rows.map((row) => headerRecord(headers, row));
    };
    return { repository, updates, rowsOf };
  }

  it("adds a missing pass_code / BENEFIT CODE column instead of dropping the code", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const withoutPassColumns = defaultHeaders.inquiries.filter((header) => header !== "pass_code");
    const { repository, updates, rowsOf } = fakeSheet({
      Customers: [[...defaultHeaders.customers]],
      Inquiries: [withoutPassColumns],
      Instagram_FMS: [defaultHeaders.instagramFms.slice(0, 15)],
    });
    const accepted = await repository.acceptLead(lead, product, { passCode: "MK30-7KQ4-X9MP" });

    expect(accepted.passCode).toBe("MK30-7KQ4-X9MP");
    expect(updates).toEqual([
      { range: `'Inquiries'!${columnLetter(withoutPassColumns.length)}1`, values: [["pass_code"]] },
      { range: "'Instagram_FMS'!P1", values: [["BENEFIT CODE"]] },
    ]);
    expect(rowsOf("Inquiries")[0].pass_code).toBe("MK30-7KQ4-X9MP");
    expect(rowsOf("Instagram_FMS")[0]["BENEFIT CODE"]).toBe("MK30-7KQ4-X9MP");

    const pass = await repository.findPassByCode("MK30-7KQ4-X9MP");
    expect(pass).toMatchObject({ passCode: "MK30-7KQ4-X9MP", inquiryId: accepted.inquiryId, customerName: "Ananya Shah", reelId: "R101" });

    const replay = await repository.acceptLead(lead, product, { passCode: "MK30-ZZZZ-ZZZZ" });
    expect(replay).toMatchObject({ wasReplay: true, passCode: "MK30-7KQ4-X9MP" });
  });

  it("writes store visits with their attribution and reads them back per customer", async () => {
    const { repository, rowsOf } = fakeSheet({ Store_Visits: [[...defaultHeaders.storeVisits]] });
    await repository.recordStoreVisit({
      action: "purchased",
      store: "Bandra",
      staffName: "Priya",
      passCode: "MK30-7KQ4-X9MP",
      customerName: "Ananya Shah",
      phone: "9876543210",
      inquiryId: "inq_1",
      customerId: "cus_1",
      productId: "MK001",
      reelId: "R101",
      campaignId: "RAKHI26",
      invoiceNumber: "INV-1",
      billAmount: "72000",
    });
    expect(rowsOf("Store_Visits")[0]).toMatchObject({ action: "purchased", store: "Bandra", reel_id: "R101", bill_amount: "72000" });
    expect(await repository.listStoreVisits("cus_1")).toHaveLength(1);
    expect(await repository.listStoreVisits("cus_2")).toHaveLength(0);
  });

  it("reads stores by name, PIN and on/off switch, whatever the header case", async () => {
    const { repository } = fakeSheet({
      Stores: [["Store", "PIN", "Active"], ["Bandra", "482913", "TRUE"], ["Ulhasnagar", "318842", "FALSE"], ["", "1", "TRUE"]],
    });
    expect(await repository.listStores()).toEqual([
      { name: "Bandra", pin: "482913", active: true },
      { name: "Ulhasnagar", pin: "318842", active: false },
    ]);
  });
});

describe("columnLetter", () => {
  it("maps indexes to spreadsheet columns", () => {
    expect([0, 15, 25, 26, 27, 51, 701, 702].map(columnLetter)).toEqual(["A", "P", "Z", "AA", "AB", "AZ", "ZZ", "AAA"]);
  });
});
