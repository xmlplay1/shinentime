import { redirect } from "next/navigation";
import { DollarSign, FileClock, CheckCircle2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminLoginAction, adminLogoutAction } from "@/app/admin/actions";
import { DashboardCharts } from "@/app/admin/widgets";
import { isAdminAuthenticated } from "@/lib/admin-auth";

type JobRow = {
  id?: string;
  name?: string | null;
  car_make_model?: string | null;
  service_package?: string | null;
  status?: string | null;
  vehicle_type?: string | null;
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
  if (typeof job.final_price === "number" && Number.isFinite(job.final_price) && job.final_price > 0) return job.final_price;
  if (typeof job.estimated_price === "number" && Number.isFinite(job.estimated_price) && job.estimated_price > 0) return job.estimated_price;
  const pkg = String(job.service_package || "").toLowerCase();
  return PACKAGE_BASE[pkg] || 0;
}

async function fetchJobs(): Promise<JobRow[]> {
  const supabase = createAdminClient();
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
  if (s === "completed") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (s === "pending" || s === "quote" || s === "new") return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
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
  const completed = jobs.filter((j) => String(j.status || "").toLowerCase() === "completed");
  const pending = jobs.filter((j) => {
    const s = String(j.status || "pending").toLowerCase();
    return s === "pending" || s === "new" || s === "quote";
  });
  const totalRevenue = completed.reduce((sum, j) => sum + inferPrice(j), 0);
  const sedanCount = jobs.filter((j) => inferVehicleType(j) === "sedan").length;
  const suvCount = jobs.filter((j) => inferVehicleType(j) === "suv").length;
  const recent = jobs.slice(0, 5);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[240px_1fr] md:px-6">
        <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:min-h-[84vh]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Shine N Time</p>
          <h2 className="mt-2 text-lg font-semibold">Admin Dashboard</h2>
          <nav className="mt-6 grid gap-2 text-sm">
            <a className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2" href="#overview">
              Overview
            </a>
            <a className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/[0.04]" href="#active-jobs">
              Active Jobs
            </a>
            <a className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/[0.04]" href="#revenue">
              Revenue
            </a>
          </nav>
          <form action={adminLogoutAction} className="mt-8">
            <button
              type="submit"
              className="w-full rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200"
            >
              Lock
            </button>
          </form>
        </aside>

        <section className="space-y-6">
          <div id="overview" className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold">${totalRevenue.toLocaleString()}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-amber-100">
                <DollarSign className="size-4" /> completed jobs only
              </div>
            </article>
            <article className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Jobs Completed</p>
              <p className="mt-2 text-3xl font-bold">{completed.length}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-100">
                <CheckCircle2 className="size-4" /> status: completed
              </div>
            </article>
            <article className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Pending Quotes</p>
              <p className="mt-2 text-3xl font-bold">{pending.length}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-blue-100">
                <FileClock className="size-4" /> new / pending / quote
              </div>
            </article>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <section id="active-jobs" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Recent Activity</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    <tr>
                      <th className="pb-3 pr-4">Customer</th>
                      <th className="pb-3 pr-4">Vehicle</th>
                      <th className="pb-3 pr-4">Package</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {recent.map((job, i) => {
                      const status = String(job.status || "pending");
                      return (
                        <tr key={job.id || `${job.name || "job"}-${i}`}>
                          <td className="py-3 pr-4">{job.name || "—"}</td>
                          <td className="py-3 pr-4 text-slate-300">{job.car_make_model || "—"}</td>
                          <td className="py-3 pr-4 capitalize">{job.service_package || "—"}</td>
                          <td className="py-3">
                            <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${badgeForStatus(status)}`}>{status}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {!recent.length ? (
                      <tr>
                        <td className="py-4 text-slate-400" colSpan={4}>
                          No jobs found yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="revenue" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Sedan vs SUV volume</h3>
              <DashboardCharts sedanCount={sedanCount} suvCount={suvCount} />
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
