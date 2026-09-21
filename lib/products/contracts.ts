import type { AttributionMapping, ProductMapping, ReelMapping, ResolvedAttributionContext } from "@/types/funnel";

/**
 * One Product Master row. Everything the experience renders comes from here or
 * from global experience defaults, so adding a product never requires code.
 */
export type ProductRecord = AttributionMapping;

export interface ProductRepository {
  findByContext(context: ProductMapping): Promise<ProductRecord | null>;
  /**
   * Every active product mapped to a Reel/campaign, one per product_id, in
   * product_position order. Used only when the link names no product.
   */
  findActiveByReel(context: ReelMapping): Promise<ProductRecord[]>;
}

export type ProductResolution =
  | { status: "resolved"; context: ResolvedAttributionContext }
  | { status: "missing" | "invalid" | "inactive" };

/** One tile on the product picker. Nothing else about the product leaves the server. */
export type ProductChoice = {
  productId: string;
  productName: string;
  /** HTTPS only; omitted otherwise, and the tile shows the name alone. */
  imageUrl?: string;
};

export type IncomingResolution = ProductResolution | { status: "choose"; products: ProductChoice[] };
