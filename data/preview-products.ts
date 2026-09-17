import type { ProductRecord } from "@/lib/products/contracts";

/** Development/test attribution mappings only; never production catalogue data. */
export const previewProducts: ProductRecord[] = [
  {
    productId: "MKBR639",
    productName: "Gold Open-Back Diamond Accented Bracelet",
    category: "Bracelet",
    collection: "Rakhi 2026",
    campaignName: "Rakhi 2026",
    reelId: "R123",
    campaignId: "RAKHI26",
    productPosition: 1,
    active: true,
  },
  {
    productId: "RG5073",
    productName: "Selected Gold Ring",
    category: "Ring",
    collection: "Bridal 2026",
    campaignName: "Bridal 2026",
    reelId: "R456",
    campaignId: "BRIDAL26",
    productPosition: 1,
    active: true,
  },
  {
    productId: "RG5074",
    productName: "Selected Diamond Solitaire Ring",
    category: "Ring",
    collection: "Bridal 2026",
    campaignName: "Bridal 2026",
    reelId: "R456",
    campaignId: "BRIDAL26",
    productPosition: 2,
    active: true,
  },
  {
    productId: "INACTIVE01",
    productName: "Unavailable Preview Mapping",
    reelId: "R999",
    campaignId: "ARCHIVE",
    active: false,
  },
];
