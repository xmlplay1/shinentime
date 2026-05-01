import type { SupabaseClient } from "@supabase/supabase-js";

export type JobForInsights = {
  id: number;
  name: string | null;
  email: string | null;
  status: string | null;
  service_package: string | null;
  vehicle_type: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  created_at: string | null;
  claimed_by: string | null;
  assigned_rep: string | null;
  notes: string | null;
  price: number | null;
  estimated_price: number | null;
  final_price: number | null;
  car_make_model?: string | null;
};

export type LogForInsights = {
  id: number;
  job_id: number;
  channel: string;
  note: string;
  created_at: string;
  created_by: string | null;
};

const PACKAGE_BASE: Record<string, number> = { silver: 37, gold: 99, platinum: 129 };

export function inferPrice(job: Pick<JobForInsights, "final_price" | "price" | "estimated_price" | "service_package">): number {
  const candidates = [job.final_price, job.price, job.estimated_price];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return PACKAGE_BASE[String(job.service_package || "").toLowerCase()] || 0;
}

export function slaTone(createdAt: string | null): "green" | "yellow" | "red" {
  const created = new Date(String(createdAt || ""));
  if (Number.isNaN(created.getTime())) return "yellow";
  const hours = (Date.now() - created.getTime()) / 3_600_000;
  if (hours < 2) return "green";
  if (hours < 6) return "yellow";
  return "red";
}

export function slaLabel(createdAt: string | null): string {
  const created = new Date(String(createdAt || ""));
  if (Number.isNaN(created.getTime())) return "age unknown";
  const mins = Math.max(0, Math.floor((Date.now() - created.getTime()) / 60000));
  if (mins < 60) return `${mins}m old`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h old`;
  const d = Math.floor(h / 24);
  return `${d}d old`;
}

export function quoteScore(job: JobForInsights): number {
  let score = 0;
  const pkg = String(job.service_package || "").toLowerCase();
  const status = String(job.status || "").toLowerCase();
  const price = inferPrice(job);
  if (pkg === "platinum") score += 35;
  else if (pkg === "gold") score += 24;
  else if (pkg === "silver") score += 12;
  score += Math.min(25, Math.round(price / 8));
  if (String(job.vehicle_type || "").toLowerCase() === "suv") score += 6;
  if (status === "pending") score += 18;
  else if (status === "confirmed") score += 8;
  if (job.preferred_date) score += 5;
  return Math.min(99, score);
}

export function followUpTemplateFor(
  status: string,
  customer: string,
  packageName: string,
  channel: "email" | "sms"
): string {
  const s = String(status || "").toLowerCase();
  const name = customer || "Customer";
  const pkg = packageName || "detail package";
  if (channel === "sms") {
    if (s === "pending") {
      return `Hi ${name} — quick follow-up on your ${pkg} quote. Reply with your best day/time and we’ll lock you in.`;
    }
    if (s === "confirmed") {
      return `Hi ${name} — your ${pkg} appointment is confirmed. Please have driveway access, water (~50ft), and keys ready.`;
    }
    return `Hi ${name} — thank you for choosing Shine N Time. If you need anything else, reply here anytime.`;
  }
  if (s === "pending") {
    return `Hi ${name}, following up on your ${pkg} quote from Shine N Time. We can reserve your spot as soon as you confirm your preferred date/time.`;
  }
  if (s === "confirmed") {
    return `Hi ${name}, your ${pkg} appointment is confirmed. Prep reminder: driveway access, water connection (~50ft reach), and keys ready at arrival.`;
  }
  return `Hi ${name}, thanks again for choosing Shine N Time for your ${pkg}. We appreciate your business and are here if you need anything else.`;
}

// Backward-compatible aliases used by digest/API routes.
export function calculateQuoteScore(job: JobForInsights | Record<string, unknown>): number {
  return quoteScore(job as JobForInsights);
}

export function hoursSince(input: string | null | undefined): number {
  const d = new Date(String(input || ""));
  if (Number.isNaN(d.getTime())) return 0;
  return (Date.now() - d.getTime()) / 3_600_000;
}

export function slaBadge(ageHours: number): { label: string; tone: "green" | "yellow" | "red" } {
  if (!Number.isFinite(ageHours) || ageHours < 2) return { label: "new", tone: "green" };
  if (ageHours < 6) return { label: "warm", tone: "yellow" };
  return { label: "urgent", tone: "red" };
}

export function hasNoResponse(jobId: number, logsByJob: Map<number, LogForInsights[]>, createdAt: string | null, thresholdHours: number): boolean {
  const created = new Date(String(createdAt || ""));
  if (Number.isNaN(created.getTime())) return false;
  const ageHours = (Date.now() - created.getTime()) / 3_600_000;
  if (ageHours < thresholdHours) return false;
  return !(logsByJob.get(jobId) || []).length;
}

export function hasCalendarConflict(job: JobForInsights, allJobs: JobForInsights[]): boolean {
  const d = String(job.preferred_date || "");
  const t = String(job.preferred_time || "").toLowerCase();
  if (!d || !t) return false;
  const comparable = allJobs.filter((j) => String(j.status || "").toLowerCase() !== "cancelled");
  return comparable.some((j) => j.id !== job.id && String(j.preferred_date || "") === d && String(j.preferred_time || "").toLowerCase() === t);
}

export type RepLeaderboardRow = {
  rep: string;
  assigned: number;
  completed: number;
  closeRate: number;
  avgResponseMin: number | null;
  revenueClosed: number;
};

export function computeRepLeaderboard(jobs: JobForInsights[], logsByJob: Map<number, LogForInsights[]>): RepLeaderboardRow[] {
  const rows = new Map<string, RepLeaderboardRow>();
  for (const job of jobs) {
    const rep = String(job.assigned_rep || job.claimed_by || "").trim() || "Unassigned";
    if (!rows.has(rep)) {
      rows.set(rep, { rep, assigned: 0, completed: 0, closeRate: 0, avgResponseMin: null, revenueClosed: 0 });
    }
    const row = rows.get(rep)!;
    row.assigned += 1;
    if (String(job.status || "").toLowerCase() === "completed") {
      row.completed += 1;
      row.revenueClosed += inferPrice(job);
    }
  }
  for (const job of jobs) {
    const rep = String(job.assigned_rep || job.claimed_by || "").trim() || "Unassigned";
    const row = rows.get(rep);
    if (!row) continue;
    const created = new Date(String(job.created_at || ""));
    if (Number.isNaN(created.getTime())) continue;
    const first = (logsByJob.get(job.id) || []).slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    if (!first) continue;
    const mins = Math.round((new Date(first.created_at).getTime() - created.getTime()) / 60000);
    if (!Number.isFinite(mins) || mins < 0) continue;
    row.avgResponseMin = row.avgResponseMin == null ? mins : Math.round((row.avgResponseMin + mins) / 2);
  }
  return Array.from(rows.values())
    .map((r) => ({ ...r, closeRate: r.assigned ? Math.round((r.completed / r.assigned) * 100) : 0 }))
    .sort((a, b) => b.revenueClosed - a.revenueClosed);
}

export type CustomerTimeline = {
  email: string;
  jobs: JobForInsights[];
  logs: LogForInsights[];
  images: Array<{ job_id: number; path: string; publicUrl: string }>;
};

export async function fetchCustomerTimelineByEmail(
  supabase: SupabaseClient,
  emailRaw: string
): Promise<CustomerTimeline | null> {
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!email.includes("@")) return null;

  const { data: jobsData } = await supabase
    .from("jobs")
    .select("id,name,email,status,service_package,vehicle_type,preferred_date,preferred_time,created_at,claimed_by,assigned_rep,notes,price,estimated_price,final_price,car_make_model")
    .eq("email", email)
    .order("created_at", { ascending: false });
  const jobs = (jobsData || []) as JobForInsights[];
  if (!jobs.length) return { email, jobs: [], logs: [], images: [] };

  const jobIds = jobs.map((j) => j.id);
  const { data: logsData } = await supabase
    .from("job_communication_logs")
    .select("id,job_id,channel,note,created_at,created_by")
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });
  const logs = (logsData || []) as LogForInsights[];

  const images: Array<{ job_id: number; path: string; publicUrl: string }> = [];
  for (const jobId of jobIds) {
    const { data: files } = await supabase.storage.from("job-images").list(`job-${jobId}`);
    for (const file of files || []) {
      const path = `job-${jobId}/${file.name}`;
      const pub = supabase.storage.from("job-images").getPublicUrl(path);
      if (pub.data.publicUrl) {
        images.push({ job_id: jobId, path, publicUrl: pub.data.publicUrl });
      }
    }
  }
  return { email, jobs, logs, images };
}
