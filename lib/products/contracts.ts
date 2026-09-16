import type {
  ProductMapping,
  PublicProductContext,
  Specification,
} from "@/types/funnel";

/**
 * One Product Master row. Everything the experience renders comes from here or
 * from global experience defaults, so adding a product never requires code.
 */
export type ProductRecord = ProductMapping & {
  productName: string;
  category?: string;
  collection?: string;
  /** 1-based position within a multi-product Reel; ManyChat resolves this upstream. */
  productPosition?: number;
  active: boolean;
  productImage: PublicProductContext["productImage"];
  specifications: Specification[];
  offerCopy?: string;
  offerExpiresAt?: string;
  calendly: PublicProductContext["calendly"];
  whatsapp?: PublicProductContext["whatsapp"];
  ctas: Omit<PublicProductContext["ctas"], "order"> & {
    order?: PublicProductContext["ctas"]["order"];
  };
  /** Never projected into the public context. Present only to prove exclusion. */
  internalPrice?: string;
};

export interface ProductRepository {
  findByContext(context: ProductMapping): Promise<ProductRecord | null>;
}

/** Global fallbacks for fields a product row may leave blank. */
export type ExperienceDefaults = {
  calendly: PublicProductContext["calendly"];
  whatsapp: PublicProductContext["whatsapp"];
};

export type ProductResolution =
  | { status: "resolved"; product: PublicProductContext }
  | { status: "missing" | "invalid" | "inactive" };
