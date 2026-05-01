export type RoutableJob = {
  id: number;
  zip: string | null;
  preferred_date: string | null;
  status: string | null;
};

function normZip(zip: string | null | undefined): string | null {
  const z = String(zip || "").replace(/\s/g, "");
  const digits = z.replace(/\D/g, "");
  if (digits.length >= 5) return digits.slice(-5).padStart(5, "0");
  return null;
}

const routableStatuses = new Set(["pending", "confirmed"]);

/** Groups Confirmed/Pending jobs on the same date + zip — for batch routing suggestions */
export function sameDayZipClusters(jobs: RoutableJob[], minSize = 2): { zip: string; date: string; ids: number[] }[] {
  const map = new Map<string, number[]>();
  for (const job of jobs) {
    const st = String(job.status || "").toLowerCase();
    if (!routableStatuses.has(st)) continue;
    const z = normZip(job.zip);
    const d = String(job.preferred_date || "").trim();
    if (!z || !d) continue;
    const key = `${d}|${z}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(job.id);
  }
  const clusters: { zip: string; date: string; ids: number[] }[] = [];
  for (const [key, ids] of map.entries()) {
    if (ids.length < minSize) continue;
    const [date, zip] = key.split("|") as [string, string];
    clusters.push({ date, zip, ids: [...new Set(ids)].sort((a, b) => a - b) });
  }
  clusters.sort((a, b) => a.date.localeCompare(b.date));
  return clusters;
}
