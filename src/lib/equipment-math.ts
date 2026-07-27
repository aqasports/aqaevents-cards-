export function calculateMonthlyDepreciation(asset: {
  purchasePrice: number;
  usefulLifeMonths: number;
}): number {
  const lifespan = asset.usefulLifeMonths || 1;
  return Math.round(asset.purchasePrice / lifespan);
}

export function calculateAssetCostPerUse(
  asset: {
    purchasePrice: number;
    maintenanceCost: number;
  },
  totalUsesCount: number
): number {
  const uses = totalUsesCount || 1;
  return Math.round((asset.purchasePrice + asset.maintenanceCost) / uses);
}
