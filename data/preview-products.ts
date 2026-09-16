import type { ProductRecord } from "@/lib/products/contracts";

/**
 * Development/test fixtures only. These are not approved production products
 * and deliberately carry no imagery. Reel `R456` demonstrates a multi-product
 * Reel where ManyChat resolves a position to a canonical product ID upstream.
 */
export const previewProducts: ProductRecord[] = [
  {
    productId: "MKBR639",
    productName: "Gold Open-Back Diamond Accented Bracelet",
    category: "Bracelet",
    collection: "Rakhi 2026",
    reelId: "R123",
    campaignId: "RAKHI26",
    productPosition: 1,
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
    category: "Ring",
    collection: "Bridal 2026",
    reelId: "R456",
    campaignId: "BRIDAL26",
    productPosition: 1,
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
    // Second product in the same Reel, reached only after ManyChat resolves
    // "second product" to this canonical ID.
    productId: "RG5074",
    productName: "Selected Diamond Solitaire Ring",
    category: "Ring",
    collection: "Bridal 2026",
    reelId: "R456",
    campaignId: "BRIDAL26",
    productPosition: 2,
    active: true,
    productImage: null,
    specifications: [
      { label: "Category", value: "Diamond Ring" },
      { label: "Diamond", value: "EF VVS VS" },
      { label: "Origin", value: "India" },
    ],
    calendly: {},
    ctas: { whatsappEnabled: true, callbackEnabled: true },
  },
  {
    productId: "INACTIVE01",
    productName: "Unavailable Preview Piece",
    category: "Pendant",
    reelId: "R999",
    campaignId: "ARCHIVE",
    active: false,
    productImage: null,
    specifications: [],
    calendly: {},
    ctas: { whatsappEnabled: false, callbackEnabled: true },
  },
];
