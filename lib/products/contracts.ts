import type { AttributionMapping, ProductMapping, ResolvedAttributionContext } from "@/types/funnel";

/**
 * One Product Master row. Everything the experience renders comes from here or
 * from global experience defaults, so adding a product never requires code.
 */
export type ProductRecord = AttributionMapping;

export interface ProductRepository {
  findByContext(context: ProductMapping): Promise<ProductRecord | null>;
}

export type ProductResolution =
  | { status: "resolved"; context: ResolvedAttributionContext }
  | { status: "missing" | "invalid" | "inactive" };
