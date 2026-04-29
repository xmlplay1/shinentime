/** Base package prices — sedan vs larger vehicles (aligned with landing page tiers). */

export type VehicleCategory = "sedan" | "suv";

export const PACKAGE_PRICING = {
  silver: { sedan: 37, suv: 49 },
  gold: { sedan: 99, suv: 115 },
  platinum: { sedan: 129, suv: 149 }
} as const;

export type PackageId = keyof typeof PACKAGE_PRICING;

export function priceFor(packageId: PackageId, vehicle: VehicleCategory): number {
  return PACKAGE_PRICING[packageId][vehicle === "suv" ? "suv" : "sedan"];
}
