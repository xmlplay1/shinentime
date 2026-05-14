import { inferPrice, type JobForInsights } from "@/lib/admin-insights";

export type MetricsJob = Pick<
  JobForInsights,
  "vehicle_type" | "status" | "final_price" | "price" | "estimated_price" | "service_package" | "booking_addons"
> & { zip?: string | null };

function normZip(raw: string | null | undefined): string | null {
  const d = String(raw || "").replace(/\D/g, "").slice(0, 5);
  return d.length === 5 ? d : null;
}

/** Jobs counted by vehicle type (non-cancelled only). */
export function vehicleMixCounts(jobs: MetricsJob[]): { sedan: number; suv: number } {
  let sedan = 0;
  let suv = 0;
  for (const j of jobs) {
    const st = String(j.status || "").toLowerCase();
    if (st === "cancelled") continue;
    const vt = String(j.vehicle_type || "").toLowerCase();
    if (vt === "suv") suv += 1;
    else sedan += 1;
  }
  return { sedan, suv };
}

/** Closed revenue (Completed only) by vehicle type. */
export function vehicleMixCompletedRevenue(jobs: MetricsJob[]): { sedan: number; suv: number } {
  let sedan = 0;
  let suv = 0;
  for (const j of jobs) {
    if (String(j.status || "").toLowerCase() !== "completed") continue;
    const amt = inferPrice(j as JobForInsights);
    const vt = String(j.vehicle_type || "").toLowerCase();
    if (vt === "suv") suv += amt;
    else sedan += amt;
  }
  return { sedan, suv };
}

export type ZipAgg = { zip: string; count: number; completedRevenue: number };

/** Top ZIPs by job count (ignores cancelled); includes realized revenue from completed jobs in that ZIP. */
export function topServicedZips(jobs: MetricsJob[], limit = 8): ZipAgg[] {
  const map = new Map<string, { count: number; completedRevenue: number }>();
  for (const j of jobs) {
    const st = String(j.status || "").toLowerCase();
    if (st === "cancelled") continue;
    const z = normZip(j.zip);
    if (!z) continue;
    const row = map.get(z) || { count: 0, completedRevenue: 0 };
    row.count += 1;
    if (st === "completed") row.completedRevenue += inferPrice(j as JobForInsights);
    map.set(z, row);
  }
  return [...map.entries()]
    .map(([zip, v]) => ({ zip, count: v.count, completedRevenue: v.completedRevenue }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
