import { BrandHeader } from "@/components/brand/BrandHeader";
import { ContextState } from "@/components/landing/ContextState";
import { FunnelExperience } from "@/components/landing/FunnelExperience";
import { repository } from "@/lib/providers/repository";
import { resolveProductContext } from "@/lib/products/resolve-product";
import { incomingContextSchema } from "@/lib/validation/schemas";

type Search = Record<string, string | string[] | undefined>;

export default async function InstagramPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const parsed = incomingContextSchema.safeParse({ productId: query.product, reelId: query.reel, campaignId: query.campaign });
  if (!parsed.success) return <ContextState status="missing" />;
  let resolved;
  try {
    resolved = await resolveProductContext(parsed.data, await repository());
  } catch {
    return <ContextState status="invalid" />;
  }
  if (resolved.status !== "resolved") return <ContextState status={resolved.status} />;
  return <div className="shell"><BrandHeader preview={process.env.DATA_PROVIDER !== "google-sheets"} /><FunnelExperience context={parsed.data} teaser={resolved.product} /></div>;
}
