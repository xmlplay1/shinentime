/** Starting-at prices from the Instagram menu — sedan vs SUV & truck. */

export type VehicleCategory = "sedan" | "suv";

export const PACKAGE_PRICING = {
  basic_interior: { sedan: 85, suv: 95 },
  full_interior: { sedan: 120, suv: 135 },
  basic_exterior: { sedan: 50, suv: 60 },
  ceramic_seal: { sedan: 85, suv: 95 },
  basic_combo: { sedan: 130, suv: 145 },
  full_combo: { sedan: 165, suv: 185 }
} as const;

export type PackageId = keyof typeof PACKAGE_PRICING;

/** Older bookings may still reference Silver / Gold / Platinum. */
export const LEGACY_PACKAGE_PRICING = {
  silver: { sedan: 37, suv: 49 },
  gold: { sedan: 99, suv: 115 },
  platinum: { sedan: 129, suv: 149 }
} as const;

export function priceFor(packageId: PackageId, vehicle: VehicleCategory): number {
  return PACKAGE_PRICING[packageId][vehicle === "suv" ? "suv" : "sedan"];
}

export function legacyPriceFor(packageId: string, vehicle: VehicleCategory): number | null {
  const key = packageId.toLowerCase() as keyof typeof LEGACY_PACKAGE_PRICING;
  const row = LEGACY_PACKAGE_PRICING[key];
  if (!row) return null;
  return row[vehicle === "suv" ? "suv" : "sedan"];
}

export function isCurrentPackageId(id: string): id is PackageId {
  return Object.prototype.hasOwnProperty.call(PACKAGE_PRICING, id);
}

/** Fallback estimate when DB row has no stored price (dashboard / insights). */
export function estimatePriceFromJobFields(input: {
  service_package: string | null | undefined;
  vehicle_type: string | null | undefined;
}): number {
  const pkg = String(input.service_package || "").toLowerCase();
  const vt: VehicleCategory = String(input.vehicle_type || "").toLowerCase() === "suv" ? "suv" : "sedan";
  if (isCurrentPackageId(pkg)) return priceFor(pkg, vt);
  return legacyPriceFor(pkg, vt) ?? 0;
}
