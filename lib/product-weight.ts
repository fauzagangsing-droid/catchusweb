export const DEFAULT_PRODUCT_WEIGHT_KG = 0.3;

export function resolveProductWeightKg(weight: number | null | undefined): number {
  return typeof weight === "number" && Number.isFinite(weight) && weight >= 0
    ? weight
    : DEFAULT_PRODUCT_WEIGHT_KG;
}
