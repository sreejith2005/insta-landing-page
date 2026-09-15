import type { ProductRecord } from "@/lib/products/contracts";

export const previewProducts: ProductRecord[] = [
  {
    productId: "MKBR639",
    productName: "Gold Open-Back Diamond Accented Bracelet",
    reelId: "R123",
    campaignId: "RAKHI26",
    active: true,
    productImage: null,
    specifications: [
      { label: "Purity", value: "18K" },
      { label: "Diamond", value: "EF VVS VS" },
      { label: "Origin", value: "India" },
    ],
    offerCopy: "Campaign privileges will appear here when verified.",
    calendly: {},
    ctas: { whatsappEnabled: true, callbackEnabled: true },
  },
  {
    productId: "RG5073",
    productName: "Selected Gold Ring",
    reelId: "R456",
    campaignId: "BRIDAL26",
    active: true,
    productImage: null,
    specifications: [
      { label: "Category", value: "Gold Ring" },
      { label: "Origin", value: "India" },
    ],
    calendly: {},
    ctas: { whatsappEnabled: true, callbackEnabled: true },
  },
  {
    productId: "INACTIVE01",
    productName: "Unavailable Preview Piece",
    reelId: "R999",
    campaignId: "ARCHIVE",
    active: false,
    productImage: null,
    specifications: [],
    calendly: {},
    ctas: { whatsappEnabled: false, callbackEnabled: true },
  },
];
