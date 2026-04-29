import { redirect } from "next/navigation";
import { DollarSign, FileClock, CheckCircle2, Clock3, CircleCheckBig } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { adminLoginAction, adminLogoutAction, createTestJobAction, sendReviewEmailAction, updateJobStatusAction } from "@/app/admin/actions";
import { DashboardCharts } from "@/app/admin/widgets";
import { isAdminAuthenticated } from "@/lib/admin-auth";

type JobRow = {
  id?: string;
  name?: string | null;
  email?: string | null;
  car_make_model?: string | null;
  service_package?: string | null;
  status?: string | null;
  vehicle_type?: string | null;
  price?: number | null;
  estimated_price?: number | null;
  final_price?: number | null;
  created_at?: string | null;
};

const PACKAGE_BASE: Record<string, number> = {
  silver: 37,
  gold: 99,
  platinum: 129
};

function inferVehicleType(job: JobRow): "sedan" | "suv" {
  const source = `${job.vehicle_type || ""} ${job.car_make_model || ""}`.toLowerCase();
  if (source.includes("suv") || source.includes("truck") || source.includes("van")) return "suv";
  return "sedan";
}

function inferPrice(job: JobRow): number {
  if (typeof job.price === "number" && Number.isFinite(job.price) && job.price > 0) return job.price;
  if (typeof job.final_price === "number" && Number.isFinite(job.final_price) && job.final_price > 0) return job.final_price;
  if (typeof job.estimated_price === "number" && Number.isFinite(job.estimated_price) && job.estimated_price > 0) return job.estimated_price;
  const pkg = String(job.service_package || "").toLowerCase();
  return PACKAGE_BASE[pkg] || 0;
}

/** Revenue only includes rows whose status is exactly Completed (case-insensitive). */
function isCompletedStatus(status: string | null | undefined): boolean {
  return String(status || "").trim().toLowerCase() === "completed";
}

async function fetchJobs(): Promise<JobRow[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[admin] jobs query error", error);
    return [];
  }
  return (data as JobRow[] | null) || [];
}

function badgeForStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed") return "border-emerald-400/45 bg-emerald-500/12 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.35)]";
  if (s === "confirmed") return "border-blue-400/45 bg-blue-500/12 text-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.3)]";
  return "border-amber-400/45 bg-amber-500/12 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.28)]";
}

export default async function AdminPage() {
  const adminPassword = process.env.ADMIN_PASSWORD || "shinentime2009";
  if (!adminPassword) {
    return (
      <main className="min-h-screen bg-black px-5 py-16 text-white md:px-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/25 bg-amber-500/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">Admin not configured</p>
          <p className="mt-2 text-sm text-amber-100">Set <code>ADMIN_PASSWORD</code> in your environment to enable /admin.</p>
        </div>
      </main>
    );
  }

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

  const jobs = await fetchJobs();
  const completed = jobs.filter((j) => isCompletedStatus(j.status));
  const pending = jobs.filter((j) => !isCompletedStatus(j.status));
  const totalRevenue = completed.reduce((sum, j) => sum + inferPrice(j), 0);
  const sedanCount = jobs.filter((j) => inferVehicleType(j) === "sedan").length;
  const suvCount = jobs.filter((j) => inferVehicleType(j) === "suv").length;
  const recent = jobs.slice(0, 5);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-6">
        <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md md:min-h-[84vh] md:border-r md:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Shine N Time</p>
          <h2 className="mt-2 text-lg font-semibold">Admin Dashboard</h2>
          <nav className="mt-6 grid gap-2 text-sm">
            <a className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-2 font-semibold text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.22)]" href="#overview">
              Overview
            </a>
            <a className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/[0.04]" href="#active-jobs">
              Active Jobs
            </a>
            <a className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/[0.04]" href="#revenue">
              Revenue
            </a>
          </nav>
          <form action={adminLogoutAction} className="mt-8 md:mt-auto md:pt-6">
            <button
              type="submit"
              className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 hover:bg-white/[0.05]"
            >
              Lock
            </button>
          </form>
        </aside>

        <section className="space-y-6">
          <div id="overview" className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/18 to-white/[0.03] p-4 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold">${totalRevenue.toLocaleString()}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-amber-100">
                <DollarSign className="size-4" /> completed jobs only
              </div>
            </article>
            <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/18 to-white/[0.03] p-4 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Jobs Completed</p>
              <p className="mt-2 text-3xl font-bold">{completed.length}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-100">
                <CheckCircle2 className="size-4" /> status: completed
              </div>
            </article>
            <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/18 to-white/[0.03] p-4 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Pending Quotes</p>
              <p className="mt-2 text-3xl font-bold">{pending.length}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-blue-100">
                <FileClock className="size-4" /> new / pending / quote
              </div>
            </article>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section id="active-jobs" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Recent Activity</h3>
              <div className="mt-4 overflow-x-auto rounded-xl border border-white/8 bg-black/25 p-1 shadow-inner shadow-black/40">
                <table className="min-w-full border-separate border-spacing-y-1 text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    <tr>
                      <th className="rounded-l-lg bg-white/[0.04] px-4 py-3 pr-4">Customer</th>
                      <th className="bg-white/[0.04] px-4 py-3 pr-4">Vehicle</th>
                      <th className="bg-white/[0.04] px-4 py-3 pr-4">Package</th>
                      <th className="bg-white/[0.04] px-4 py-3">Status</th>
                      <th className="rounded-r-lg bg-white/[0.04] px-4 py-3">Follow Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((job, i) => {
                      const status = String(job.status || "pending");
                      return (
                        <tr
                          key={job.id || `${job.name || "job"}-${i}`}
                          className="group transition-[background-color,box-shadow] hover:bg-white/[0.05]"
                        >
                          <td className="rounded-l-xl border border-white/5 border-r-0 bg-white/[0.02] px-4 py-3 pr-3 text-slate-100 transition group-hover:border-amber-400/15 group-hover:bg-white/[0.04]">
                            {job.name || "—"}
                          </td>
                          <td className="border-y border-white/5 bg-white/[0.02] px-4 py-3 pr-3 text-slate-300 transition group-hover:border-amber-400/15 group-hover:bg-white/[0.04]">
                            {job.car_make_model || "—"}
                          </td>
                          <td className="border-y border-white/5 bg-white/[0.02] px-4 py-3 pr-3 capitalize transition group-hover:border-amber-400/15 group-hover:bg-white/[0.04]">
                            {job.service_package || "—"}
                          </td>
                          <td className="border-y border-white/5 bg-white/[0.02] px-4 py-3 transition group-hover:border-amber-400/15 group-hover:bg-white/[0.04]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${badgeForStatus(status)}`}>{status}</span>
                              {job.id != null ? (
                                <form action={updateJobStatusAction} className="inline-flex items-center gap-2">
                                  <input type="hidden" name="id" value={String(job.id)} />
                                  <select
                                    name="status"
                                    defaultValue={status}
                                    className="rounded-md border border-white/15 bg-black/60 px-2 py-1 text-xs capitalize text-slate-200"
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Completed">Completed</option>
                                  </select>
                                  <button
                                    type="submit"
                                    className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-200"
                                  >
                                    Save
                                  </button>
                                </form>
                              ) : null}
                            </div>
                          </td>
                          <td className="rounded-r-xl border border-white/5 border-l-0 bg-white/[0.02] px-4 py-3 transition group-hover:border-amber-400/15 group-hover:bg-white/[0.04]">
                            {isCompletedStatus(status) && job.id != null && job.email ? (
                              <form action={sendReviewEmailAction}>
                                <input type="hidden" name="id" value={String(job.id)} />
                                <input type="hidden" name="name" value={String(job.name || "")} />
                                <input type="hidden" name="email" value={String(job.email || "")} />
                                <button
                                  type="submit"
                                  className="rounded-md border border-blue-400/35 bg-blue-500/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-200 hover:bg-blue-500/20"
                                >
                                  Send Review Email
                                </button>
                              </form>
                            ) : (
                              <span className="text-[11px] text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!recent.length ? (
                      <tr>
                        <td className="py-6 text-center text-slate-400" colSpan={5}>
                          <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                            <Clock3 className="size-8 text-slate-500" />
                            <p>No jobs found yet.</p>
                            <form action={createTestJobAction}>
                              <button
                                type="submit"
                                className="rounded-lg border border-amber-400/40 bg-amber-500/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-amber-200 hover:bg-amber-500/20"
                              >
                                Create Test Job
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="revenue" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Sedan vs SUV volume</h3>
              <DashboardCharts sedanCount={sedanCount} suvCount={suvCount} />
              {!sedanCount && !suvCount ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-6 text-center text-sm text-slate-400">
                  <CircleCheckBig className="mx-auto mb-2 size-6 text-slate-500" />
                  No vehicle data yet. Add jobs to populate this chart.
                </div>
              ) : null}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
