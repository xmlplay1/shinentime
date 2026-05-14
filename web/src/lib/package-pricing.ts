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

/** À-la-carte add-ons (flat menu prices). Shown on booking + summed into estimates. */
export const BOOKING_ADDONS = [
  { id: "pet_hair", label: "Pet hair removal", price: 35 },
  { id: "steam_sanitize", label: "Extra steam / sanitization", price: 25 },
  { id: "leather_boost", label: "Leather conditioning boost", price: 25 },
  { id: "trim_dressing", label: "Trim / vinyl / rubber dressing", price: 15 },
  { id: "windows_in_out", label: "Interior & exterior windows", price: 20 },
  { id: "tire_shine", label: "Tire shine", price: 15 }
] as const;

export type AddonId = (typeof BOOKING_ADDONS)[number]["id"];

export function isAddonId(id: string): id is AddonId {
  return BOOKING_ADDONS.some((a) => a.id === id);
}

export function addonsTotal(ids: readonly string[]): number {
  let sum = 0;
  for (const id of ids) {
    const row = BOOKING_ADDONS.find((a) => a.id === id);
    if (row) sum += row.price;
  }
  return sum;
}

export type VehicleConditionBand = "light" | "moderate" | "heavy";

/** Rough labor allowance for soil level (confirmed on site). */
export function conditionLaborAdjustment(condition: VehicleConditionBand | string | null | undefined): number {
  const c = String(condition || "").toLowerCase();
  if (c === "moderate") return 15;
  if (c === "heavy") return 35;
  return 0;
}

export function bookingEstimateTotal(input: {
  packageId: PackageId;
  vehicle: VehicleCategory;
  addonIds: readonly string[];
  vehicleCondition?: string | null;
}): number {
  const base = priceFor(input.packageId, input.vehicle);
  const addons = addonsTotal(input.addonIds);
  const labor = conditionLaborAdjustment(input.vehicleCondition ?? null);
  return base + addons + labor;
}

/** Fallback estimate when DB row has no stored price (dashboard / insights). */
export function estimatePriceFromJobFields(input: {
  service_package: string | null | undefined;
  vehicle_type: string | null | undefined;
  booking_addons?: unknown;
}): number {
  const pkg = String(input.service_package || "").toLowerCase();
  const vt: VehicleCategory = String(input.vehicle_type || "").toLowerCase() === "suv" ? "suv" : "sedan";
  let base = 0;
  if (isCurrentPackageId(pkg)) base = priceFor(pkg, vt);
  else base = legacyPriceFor(pkg, vt) ?? 0;

  let addonIds: string[] = [];
  let condition: string | undefined;
  const raw = input.booking_addons;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const ids = o.addon_ids;
    if (Array.isArray(ids)) addonIds = ids.filter((x): x is string => typeof x === "string");
    const vc = o.vehicle_condition;
    if (typeof vc === "string") condition = vc;
  } else if (Array.isArray(raw)) {
    addonIds = raw.filter((x): x is string => typeof x === "string");
  }

  return base + addonsTotal(addonIds) + conditionLaborAdjustment(condition ?? null);
}
