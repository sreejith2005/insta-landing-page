type Search = Record<string, string | string[] | undefined>;

/**
 * The incoming landing link with `product` set and every other single-valued
 * parameter (source, UTMs, the DM fields) kept, so a picked product lands on
 * exactly the link a product-level DM would have sent.
 */
export function linkWithProduct(query: Search, productId: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key !== "product" && typeof value === "string") params.set(key, value);
  }
  params.set("product", productId);
  return `/instagram?${params}`;
}
