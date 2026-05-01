import { redirect } from "next/navigation";
import {
  addCommunicationLogAction,
  adminLoginAction,
  adminLogoutAction,
  clearPipelineAction,
  claimJobAction,
  createTeamMemberAction,
  createTestJobAction,
  deleteJobAction,
  sendTestAdminEmailAction,
  updateJobStatusAction,
  uploadJobImageAction
} from "@/app/admin/actions";
import { CalendarPanel } from "@/app/admin/CalendarPanel";
import { ScriptSidebar } from "@/app/admin/ScriptSidebar";
import { DashboardCharts } from "@/app/admin/widgets";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { formatPhoneUs, inferMonthlyProfit, monthKey, normalizeEmail } from "@/lib/admin-format";
import { createAdminClient } from "@/lib/supabase/admin";
import { CircleCheckBig, Clock3, DollarSign, FileClock, TrendingUp } from "lucide-react";

type Role = "ADMIN" | "SERVICE_REP";
type JobStatus = "Pending" | "Confirmed" | "Completed";

type JobRow = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  car_make_model: string | null;
  service_package: string | null;
  status: string | null;
  vehicle_type: string | null;
  price: number | null;
  estimated_price: number | null;
  final_price: number | null;
  created_at: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  claimed_by: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  assigned_rep: string | null;
};

type CommunicationLog = {
  id: number;
  job_id: number;
  channel: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

const PACKAGE_BASE: Record<string, number> = { silver: 37, gold: 99, platinum: 129 };

function inferPrice(job: JobRow): number {
  const candidates = [job.final_price, job.price, job.estimated_price];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return PACKAGE_BASE[String(job.service_package || "").toLowerCase()] || 0;
}

function isCompleted(status: string | null | undefined) {
  return String(status || "").toLowerCase() === "completed";
}

function statusClass(status: string | null | undefined): string {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "border-emerald-400/45 bg-emerald-500/12 text-emerald-200";
  if (s === "confirmed") return "border-blue-400/45 bg-blue-500/12 text-blue-200";
  return "border-amber-400/45 bg-amber-500/12 text-amber-200";
}

function toStatus(status: string | null | undefined): JobStatus {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "Completed";
  if (s === "confirmed") return "Confirmed";
  return "Pending";
}

function isAdminRole(email: string): boolean {
  const env = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const defaults = ["tawfiqalshara424@gmail.com", "shine.n.time.detailing@gmail.com"];
  return [...defaults, ...env].includes(email.toLowerCase());
}

async function ensureProfile(email: string): Promise<Profile | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const { data: existing } = await supabase.from("profiles").select("*").eq("email", normalized).maybeSingle();
  if (existing) return existing as Profile;
  const role: Role = isAdminRole(normalized) ? "ADMIN" : "SERVICE_REP";
  const id = crypto.randomUUID();
  const payload = { id, email: normalized, full_name: normalized.split("@")[0], role };
  await supabase.from("profiles").insert(payload);
  return payload;
}

async function loadData(actorEmail: string) {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const profile = await ensureProfile(actorEmail);
  if (!profile) return null;

  const [{ data: jobs, error: jobsError }, { data: logs }, { data: reps }] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    supabase.from("job_communication_logs").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,email,full_name,role").order("created_at", { ascending: false })
  ]);
  if (jobsError) {
    console.error("[admin] jobs query error", jobsError);
    return { profile, jobs: [], logs: [], reps: (reps || []) as Profile[] };
  }
  return {
    profile,
    jobs: (jobs || []) as JobRow[],
    logs: (logs || []) as CommunicationLog[],
    reps: (reps || []) as Profile[]
  };
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const adminPassword = process.env.ADMIN_PASSWORD || "shinentime2009";
  if (!adminPassword) redirect("/?error=admin-password");

  const authed = await isAdminAuthenticated();
  if (!authed) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950 px-5 py-16 text-white md:px-10">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">Private Admin</p>
          <h1 className="mt-3 text-2xl font-semibold">Dashboard access</h1>
          <p className="mt-2 text-sm text-slate-400">Enter your admin password to continue.</p>
          <form action={adminLoginAction} className="mt-6 space-y-4">
            <input
              name="password"
              type="password"
              required
              placeholder="Admin password"
              className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm outline-none ring-amber-400/50 focus:ring-2"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black"
            >
              Unlock dashboard
            </button>
          </form>
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const actorEmail = normalizeEmail(typeof params.as === "string" ? params.as : "") || "shine.n.time.detailing@gmail.com";
  const data = await loadData(actorEmail);
  if (!data) {
    return <main className="min-h-screen bg-black p-8 text-white">Missing Supabase configuration.</main>;
  }
  const { profile, jobs, logs, reps } = data;
  const isAdmin = profile.role === "ADMIN";
  const completed = jobs.filter((j) => isCompleted(j.status));
  const totalRevenue = completed.reduce((sum, j) => sum + inferPrice(j), 0);
  const thisMonth = monthKey(new Date());
  const monthlyProfit = inferMonthlyProfit(
    jobs
      .filter((j) => monthKey(j.preferred_date || j.created_at || "") === thisMonth && isCompleted(j.status))
      .reduce((sum, j) => sum + inferPrice(j), 0)
  );
  const conversionRate = jobs.length ? Math.round((completed.length / jobs.length) * 100) : 0;
  const pending = jobs.filter((j) => !isCompleted(j.status));
  const sedanCount = jobs.filter((j) => (j.vehicle_type || "").toLowerCase() !== "suv").length;
  const suvCount = jobs.filter((j) => (j.vehicle_type || "").toLowerCase() === "suv").length;
  const logsByJob = new Map<number, CommunicationLog[]>();
  for (const log of logs) {
    if (!logsByJob.has(log.job_id)) logsByJob.set(log.job_id, []);
    logsByJob.get(log.job_id)!.push(log);
  }

  const sortedReps = reps.filter((r) => r.role === "SERVICE_REP" || isAdmin);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Shine N Time</p>
          <h2 className="mt-2 text-lg font-semibold">Ultimate Command Center</h2>
          <p className="mt-2 text-xs text-slate-400">Role: {profile.role}</p>
          <nav className="mt-6 grid gap-2 text-sm">
            <a className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-2 font-semibold text-amber-200" href="#calendar">
              Calendar
            </a>
            <a className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/[0.04]" href="#pipeline">
              Lead Pipeline
            </a>
            {isAdmin ? (
              <a className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/[0.04]" href="#team">
                Team Settings
              </a>
            ) : null}
          </nav>
          <form action={adminLogoutAction} className="mt-8">
            <button className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Lock
            </button>
          </form>
        </aside>

        <section className="space-y-6">
          {isAdmin ? (
            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/18 to-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Total Revenue</p>
                <p className="mt-2 text-3xl font-bold">${totalRevenue.toLocaleString()}</p>
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-amber-100">
                  <DollarSign className="size-4" /> completed jobs
                </div>
              </article>
              <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/18 to-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Monthly Profit</p>
                <p className="mt-2 text-3xl font-bold">${monthlyProfit.toLocaleString()}</p>
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-blue-100">
                  <TrendingUp className="size-4" /> est. after 30% costs
                </div>
              </article>
              <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/18 to-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Conversion Rate</p>
                <p className="mt-2 text-3xl font-bold">{conversionRate}%</p>
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-100">
                  <FileClock className="size-4" /> completed vs total leads
                </div>
              </article>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              Service Rep mode enabled: financial stats are hidden. Focus on lead pipeline + outreach.
            </div>
          )}

          <div id="calendar" className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <CalendarPanel jobs={jobs} />
            <ScriptSidebar
              customerName={jobs[0]?.name || "Customer"}
              packageName={jobs[0]?.service_package || "Detail Package"}
              reviewLink={process.env.REVIEW_REQUEST_URL || "https://www.google.com/search?q=Shine+N+Time+detailing+reviews"}
            />
          </div>

          <section id="pipeline" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Lead Pipeline</h3>
              <div className="flex flex-wrap items-center gap-2">
                <form action={sendTestAdminEmailAction}>
                  <button className="rounded-lg border border-blue-400/40 bg-blue-500/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-blue-200">
                    Test Admin Email
                  </button>
                </form>
                <form action={createTestJobAction}>
                  <button className="rounded-lg border border-amber-400/40 bg-amber-500/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-amber-200">
                    Create Test Job
                  </button>
                </form>
                <form action={clearPipelineAction}>
                  <input type="hidden" name="mode" value="completed" />
                  <button className="rounded-lg border border-rose-400/40 bg-rose-500/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-rose-200">
                    Clear Completed
                  </button>
                </form>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {jobs.map((job) => {
                const status = toStatus(job.status);
                const mapQuery = encodeURIComponent([job.address, job.city, job.state, job.zip].filter(Boolean).join(", "));
                const jobLogs = logsByJob.get(job.id) || [];
                return (
                  <article key={job.id} className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{job.name || "Unknown Customer"}</p>
                        <p className="text-xs text-slate-400">{formatPhoneUs(job.phone)} · {normalizeEmail(job.email) || "no email"}</p>
                        <p className="text-xs text-slate-400">{job.car_make_model || "Vehicle TBD"} · {(job.service_package || "package").toUpperCase()}</p>
                      </div>
                      <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${statusClass(status)}`}>{status}</span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-300 md:grid-cols-2">
                      <p>Date: {job.preferred_date || "TBD"} · {job.preferred_time || "TBD"}</p>
                      <p>Assigned: {job.assigned_rep || job.claimed_by || "Unassigned"}</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={`https://maps.google.com/?q=${mapQuery || encodeURIComponent("Canton, MI")}`}
                        target="_blank"
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs"
                        rel="noreferrer"
                      >
                        Navigate
                      </a>
                      <a href={`tel:${job.phone || ""}`} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs">
                        Call
                      </a>
                      <a href={`sms:${job.phone || ""}`} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs">
                        SMS
                      </a>

                      <form action={uploadJobImageAction} className="flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1">
                        <input type="hidden" name="job_id" value={job.id} />
                        <input type="hidden" name="type" value="before" />
                        <input name="image" type="file" accept="image/*" capture="environment" className="w-[130px] text-[10px]" />
                        <button className="text-[10px] font-semibold uppercase tracking-[0.12em]">Photos</button>
                      </form>

                      <form action={claimJobAction} className="flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1">
                        <input type="hidden" name="id" value={job.id} />
                        <input type="hidden" name="phone" value={job.phone || ""} />
                        <select name="rep" className="rounded bg-black px-2 py-1 text-[10px]">
                          <option value="">Assign rep</option>
                          {sortedReps.map((r) => (
                            <option key={r.id} value={r.full_name || r.email}>{r.full_name || r.email}</option>
                          ))}
                        </select>
                        <button className="text-[10px] font-semibold uppercase">Save</button>
                      </form>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <form action={updateJobStatusAction} className="inline-flex items-center gap-2">
                        <input type="hidden" name="id" value={job.id} />
                        <select name="status" defaultValue={status} className="rounded-md border border-white/15 bg-black/60 px-2 py-1 text-xs">
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <button type="submit" className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase">
                          Update
                        </button>
                      </form>

                      <form action={addCommunicationLogAction} className="inline-flex flex-wrap items-center gap-2">
                        <input type="hidden" name="job_id" value={job.id} />
                        <input type="hidden" name="created_by" value={profile.full_name || profile.email} />
                        <select name="channel" className="rounded border border-white/15 bg-black px-2 py-1 text-[10px]">
                          <option value="sms">sms</option>
                          <option value="call">call</option>
                          <option value="email">email</option>
                          <option value="internal">internal</option>
                        </select>
                        <input
                          name="note"
                          required
                          placeholder="Communication note"
                          className="rounded border border-white/15 bg-black px-2 py-1 text-[10px]"
                        />
                        <button className="rounded border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-[10px] uppercase">Log</button>
                      </form>
                      <form action={deleteJobAction}>
                        <input type="hidden" name="id" value={job.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-rose-400/35 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold uppercase text-rose-100"
                        >
                          Delete
                        </button>
                      </form>
                    </div>

                    <div className="mt-3 rounded-md border border-white/10 bg-black/35 p-2 text-[11px] text-slate-400">
                      {jobLogs.length ? (
                        jobLogs.slice(0, 3).map((log) => (
                          <p key={log.id}>
                            <span className="uppercase text-slate-500">{log.channel}</span>: {log.note}
                          </p>
                        ))
                      ) : (
                        <p>No communication logs yet.</p>
                      )}
                    </div>
                  </article>
                );
              })}
              {!jobs.length ? (
                <div className="rounded-xl border border-white/10 bg-black/25 p-6 text-center text-sm text-slate-400">
                  <Clock3 className="mx-auto mb-2 size-7 text-slate-500" />
                  No jobs found yet.
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Vehicle Mix</h3>
              <DashboardCharts sedanCount={sedanCount} suvCount={suvCount} />
              {!sedanCount && !suvCount ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-6 text-center text-sm text-slate-400">
                  <CircleCheckBig className="mx-auto mb-2 size-6 text-slate-500" />
                  No vehicle data yet.
                </div>
              ) : null}
            </section>

            {isAdmin ? (
              <section id="team" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Team Settings</h3>
                <form action={createTeamMemberAction} className="mt-4 grid gap-3">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="teammate@email.com"
                    className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    name="full_name"
                    placeholder="Full name"
                    className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm"
                  />
                  <select name="role" className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm">
                    <option value="SERVICE_REP">SERVICE_REP</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-black">
                    Add Team Member
                  </button>
                </form>
                <div className="mt-4 text-xs text-slate-400">
                  {sortedReps.length
                    ? sortedReps.map((r) => <p key={r.id}>{r.full_name || r.email} · {r.role}</p>)
                    : <p>No team members yet.</p>}
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                Financials and team settings are restricted to admins.
              </section>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-400">
            Mobile Action Center active: Navigate, Call/SMS, and Photos upload to Supabase `job-images` bucket.
          </section>
        </section>
      </div>
    </main>
  );
}
