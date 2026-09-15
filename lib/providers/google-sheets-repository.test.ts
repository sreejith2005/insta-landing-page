import { describe, expect, it } from "vitest";

import { headerRecord, productFromRow } from "./google-sheets-repository";

describe("Google Sheets row mapping", () => {
  it("maps headers independently of column order", () => {
    expect(headerRecord(["product_id", "active_status", "product_name"], ["MK1", "true", "Ring"])).toEqual({ product_id: "MK1", active_status: "true", product_name: "Ring" });
  });

  it("creates a flexible product record without projecting price", () => {
    const record = productFromRow({
      product_id: "MKBR639", product_name: "Bracelet", reel_id: "R123", campaign_id: "RAKHI26", active_status: "true",
      specifications_json: '[{"label":"Purity","value":"18K"}]', price: "999", image_url: "", image_alt: "",
      whatsapp_enabled: "true", callback_enabled: "true",
    });
    expect(record?.specifications).toEqual([{ label: "Purity", value: "18K" }]);
    expect(JSON.stringify(record)).not.toContain("999");
  });
});
