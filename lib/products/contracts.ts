import type { IncomingInstagramContext, PublicProductContext, Specification } from "@/types/funnel";

export type ProductRecord = IncomingInstagramContext & {
  productName: string;
  active: boolean;
  productImage: PublicProductContext["productImage"];
  specifications: Specification[];
  offerCopy?: string;
  offerExpiresAt?: string;
  calendly: PublicProductContext["calendly"];
  ctas: Omit<PublicProductContext["ctas"], "order"> & {
    order?: PublicProductContext["ctas"]["order"];
  };
  internalPrice?: string;
};

export interface ProductRepository {
  findByContext(context: IncomingInstagramContext): Promise<ProductRecord | null>;
}

export type ProductResolution =
  | { status: "resolved"; product: PublicProductContext }
  | { status: "missing" | "invalid" | "inactive" };
