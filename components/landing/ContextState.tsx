import { BrandHeader } from "@/components/brand/BrandHeader";

const copy = {
  missing: ["We could not find this selection", "Please return to your Instagram conversation and use the latest private link."],
  invalid: ["This selection link could not be verified", "For your privacy, please return to Instagram and request a new private link."],
  inactive: ["This piece is currently unavailable", "Our team can help you explore a suitable alternative."],
} as const;

export function ContextState({ status }: { status: keyof typeof copy }) {
  return <div className="shell"><BrandHeader /><main className="context-state"><p className="state-mark" aria-hidden="true">◇</p><h1>{copy[status][0]}</h1><p>{copy[status][1]}</p></main></div>;
}
