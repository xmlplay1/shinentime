import { redirect } from "next/navigation";
import {
  adminLoginAction,
  adminLogoutAction,
  cancelJobAction,
  clearPipelineAction,
  createTeamMemberAction,
  createTestJobAction,
  rescheduleJobAction,
  sendTestAdminEmailAction
} from "@/app/admin/actions";
import { CalendarPanel } from "@/app/admin/CalendarPanel";
import { ScriptSidebar } from "@/app/admin/ScriptSidebar";
import { DashboardCharts } from "@/app/admin/widgets";
import { BatchJobsProvider, BatchJobsToolbar } from "@/app/admin/BatchJobsControls";
import { AdminQuickFab } from "@/app/admin/AdminQuickFab";
import { PipelineLeadCard } from "@/app/admin/PipelineLeadCard";
import { listJobImagePublicUrls } from "@/app/admin/customer-helpers";
import { vehicleMixCounts, vehicleMixCompletedRevenue, topServicedZips } from "@/lib/admin-dashboard-metrics";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { formatPhoneUs, inferMonthlyProfit, monthKey, normalizeEmail } from "@/lib/admin-format";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimatePriceFromJobFields } from "@/lib/package-pricing";
import { REFERRAL_PROGRAM_ENABLED } from "@/lib/referral-flags";
import { Clock3, DollarSign, FileClock } from "lucide-react";

type Role = "ADMIN" | "SERVICE_REP";

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
  customer_id?: string | null;
  referred_by_code?: string | null;
  referral_discount_amount?: number | null;
  booking_addons?: unknown;
};

type CommunicationLog = {
  id: number;
  job_id: number;
  channel: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

type SystemLogRow = {
  id: number;
  job_id: number;
  event_type: string;
  message: string;
  actor_name: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

type ReferralRow = {
  id: string;
  referrer_customer_id: string;
  referee_customer_id: string;
  referee_first_job_id: number | null;
  status: string | null;
  referrer_code_used: string | null;
  referrer_credit_usd: number | null;
  referee_discount_usd: number | null;
  rewards_settled_at: string | null;
  validated_at: string | null;
  abuse_reason: string | null;
  created_at: string | null;
};

type CustomerMini = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  referral_code: string | null;
  credit_balance: number | null;
};

function inferPrice(job: JobRow): number {
  const candidates = [job.final_price, job.price, job.estimated_price];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return estimatePriceFromJobFields(job);
}

function isCompleted(status: string | null | undefined) {
  return String(status || "").toLowerCase() === "completed";
}

function pipelineStatusLabel(raw: string | null | undefined): string {
  const s = String(raw || "").toLowerCase();
  if (s === "completed") return "Completed";
  if (s === "confirmed") return "Confirmed";
  if (s === "cancelled") return "Cancelled";
  if (s === "archived") return "Archived";
  if (s === "pending") return "Pending";
  const t = raw?.trim();
  return t ? String(t) : "Pending";
}

function pipelineStatusClass(raw: string | null | undefined): string {
  const s = String(raw || "").toLowerCase();
  if (s === "completed") return "border-emerald-500/50 bg-emerald-600/15 text-emerald-100";
  if (s === "cancelled") return "border-rose-500/55 bg-rose-600/18 text-rose-100";
  if (s === "confirmed") return "border-amber-400/50 bg-amber-500/16 text-amber-100";
  if (s === "pending") return "border-yellow-500/45 bg-yellow-500/14 text-yellow-100";
  if (s === "archived") return "border-violet-400/45 bg-violet-500/12 text-violet-200";
  return "border-slate-500/40 bg-slate-600/15 text-slate-200";
}

function statusSelectValue(raw: string | null | undefined): string {
  const s = String(raw || "").toLowerCase();
  if (s === "completed") return "Completed";
  if (s === "confirmed") return "Confirmed";
  if (s === "cancelled") return "Cancelled";
  if (s === "archived") return "Archived";
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

async function loadData(actorEmail: string, includeArchived: boolean) {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const profile = await ensureProfile(actorEmail);
  if (!profile) return null;

  const jobsQuery = supabase.from("jobs").select("*").order("created_at", { ascending: false });
  if (!includeArchived) jobsQuery.neq("status", "Archived");

  const [{ data: jobs, error: jobsError }, { data: logs }, { data: reps }, { data: sysRows, error: sysErr }] =
    await Promise.all([
      jobsQuery,
      supabase.from("job_communication_logs").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,email,full_name,role").order("created_at", { ascending: false }),
      supabase.from("job_system_logs").select("*").order("created_at", { ascending: false }).limit(500)
    ]);
  if (jobsError) {
    console.error("[admin] jobs query error", jobsError);
    return {
      profile,
      jobs: [],
      logs: [],
      reps: (reps || []) as Profile[],
      referrals: [],
      referralCustomers: new Map(),
      systemLogs: [],
      jobImagesByJob: new Map()
    };
  }
  if (sysErr) {
    console.error("[admin] job_system_logs query error — apply migration if missing table", sysErr);
  }
  const systemLogs = (sysErr ? [] : sysRows || []) as SystemLogRow[];

  const jobList = (jobs || []) as JobRow[];
  const jobImagesByJob = new Map<number, { name: string; url: string }[]>();
  await Promise.all(
    jobList.map(async (j) => {
      const urls = await listJobImagePublicUrls(supabase, j.id);
      if (urls.length) jobImagesByJob.set(j.id, urls);
    })
  );

  let referrals: ReferralRow[] = [];
  let referralCustomers = new Map<string, CustomerMini>();

  if (REFERRAL_PROGRAM_ENABLED) {
    const { data: referralRows, error: referralsError } = await supabase
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    if (referralsError) {
      console.error("[admin] referrals query error", referralsError);
    } else {
      referrals = (referralRows || []) as ReferralRow[];
      const custIds = new Set<string>();
      for (const r of referrals) {
        custIds.add(r.referrer_customer_id);
        custIds.add(r.referee_customer_id);
      }
      if (custIds.size > 0) {
        const { data: custRows, error: custErr } = await supabase
          .from("customers")
          .select("id,full_name,email,phone,referral_code,credit_balance")
          .in("id", [...custIds]);
        if (custErr) console.error("[admin] referral customers query error", custErr);
        referralCustomers = new Map((custRows || []).map((c) => [String((c as CustomerMini).id), c as CustomerMini]));
      }
    }
  }

  return {
    profile,
    jobs: jobList,
    logs: (logs || []) as CommunicationLog[],
    reps: (reps || []) as Profile[],
    referrals,
    referralCustomers,
    systemLogs,
    jobImagesByJob
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
  const showArchived = String(params.archived || "").toLowerCase() === "1";
  const quickBookParam = typeof params.quickBook === "string" ? params.quickBook : "";
  const data = await loadData(actorEmail, showArchived);
  if (!data) {
    return <main className="min-h-screen bg-black p-8 text-white">Missing Supabase configuration.</main>;
  }
  const { profile, jobs, logs, reps, referrals, referralCustomers, systemLogs, jobImagesByJob } = data;
  const isAdmin = profile.role === "ADMIN";
  const actorLabel = profile.full_name || profile.email || "Team";
  const completed = jobs.filter((j) => isCompleted(j.status));
  const totalRevenue = completed.reduce((sum, j) => sum + inferPrice(j), 0);
  const thisMonth = monthKey(new Date());
  const monthCompletedRevenue = jobs
    .filter((j) => monthKey(j.preferred_date || j.created_at || "") === thisMonth && isCompleted(j.status))
    .reduce((sum, j) => sum + inferPrice(j), 0);
  const monthlyProfit = inferMonthlyProfit(monthCompletedRevenue);
  const conversionRate = jobs.length ? Math.round((completed.length / jobs.length) * 100) : 0;
  const mix = vehicleMixCounts(jobs);
  const revenueMix = vehicleMixCompletedRevenue(jobs);
  const hotZips = topServicedZips(jobs, 8);
  const revenueGoalUsdRaw = process.env.ADMIN_MONTHLY_REVENUE_GOAL_USD;
  const revenueGoalUsd = revenueGoalUsdRaw ? Number.parseFloat(revenueGoalUsdRaw) : NaN;
  const goalProgressPct =
    Number.isFinite(revenueGoalUsd) && revenueGoalUsd > 0
      ? Math.min(100, Math.round((monthCompletedRevenue / revenueGoalUsd) * 1000) / 10)
      : null;
  const systemLogsByJob = new Map<number, SystemLogRow[]>();
  for (const sl of systemLogs) {
    if (!systemLogsByJob.has(sl.job_id)) systemLogsByJob.set(sl.job_id, []);
    systemLogsByJob.get(sl.job_id)!.push(sl);
  }
  for (const arr of systemLogsByJob.values()) {
    arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  const logsByJob = new Map<number, CommunicationLog[]>();
  for (const log of logs) {
    if (!logsByJob.has(log.job_id)) logsByJob.set(log.job_id, []);
    logsByJob.get(log.job_id)!.push(log);
  }

  const sortedReps = reps.filter((r) => r.role === "SERVICE_REP" || isAdmin);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[250px_1fr]">
        <aside className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md lg:min-h-[calc(100vh-3rem)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Shine N Time</p>
          <h2 className="mt-2 text-lg font-semibold">Ultimate Command Center</h2>
          <p className="mt-2 text-xs text-slate-400">Role: {profile.role}</p>
          <nav className="mt-6 flex flex-1 flex-col gap-2 text-sm">
            <a className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-2 font-semibold text-amber-200" href="#calendar">
              Calendar
            </a>
            <a className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/[0.04]" href="#pipeline">
              Lead Pipeline
            </a>
            {isAdmin && REFERRAL_PROGRAM_ENABLED ? (
              <a className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/[0.04]" href="#referrals">
                Referrals
              </a>
            ) : null}
            {isAdmin ? (
              <a className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:bg-white/[0.04]" href="#team">
                Team Settings
              </a>
            ) : null}
          </nav>
          <form action={adminLogoutAction} className="mt-6 border-t border-white/10 pt-4 max-lg:mt-6">
            <button className="w-full rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 max-lg:py-3">
              Lock session
            </button>
          </form>
        </aside>

        <section className="space-y-6 pb-28 lg:pb-0">
          {isAdmin ? (
            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/18 to-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Total Revenue</p>
                <p className="mt-2 text-3xl font-bold">${totalRevenue.toLocaleString()}</p>
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-amber-100">
                  <DollarSign className="size-4" /> completed jobs (all time)
                </div>
                {goalProgressPct != null ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-amber-100/90">
                      <span>This month vs goal</span>
                      <span className="tabular-nums font-semibold">
                        ${Math.round(monthCompletedRevenue).toLocaleString()} / ${Math.round(revenueGoalUsd).toLocaleString()} ({goalProgressPct}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300 transition-[width] duration-300"
                        style={{ width: `${goalProgressPct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Set <span className="font-mono text-slate-400">ADMIN_MONTHLY_REVENUE_GOAL_USD</span> in env to tune this bar.
                    </p>
                  </div>
                ) : null}
              </article>
              <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/18 to-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Monthly Profit</p>
                <p className="mt-2 text-3xl font-bold">${monthlyProfit.toLocaleString()}</p>
                <p className="mt-3 text-sm font-medium leading-snug text-blue-50/95 lg:text-base">
                  Estimated after ~30% costs on this month&apos;s closed revenue (${Math.round(monthCompletedRevenue).toLocaleString()}).
                </p>
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
            <CalendarPanel
              jobs={jobs}
              rescheduleAction={rescheduleJobAction}
              cancelAction={cancelJobAction}
              actorName={actorLabel}
              showArchived={showArchived}
            />
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
                <a
                  href={showArchived ? "/admin" : "/admin?archived=1"}
                  className="rounded-lg border border-violet-400/40 bg-violet-500/12 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-200"
                >
                  {showArchived ? "Hide Archived" : "View Archived"}
                </a>
              </div>
            </div>
            <BatchJobsProvider>
              <BatchJobsToolbar
                actorName={actorLabel}
                reps={sortedReps.map((r) => ({ id: r.id, label: String(r.full_name || r.email) }))}
              />
              <div className="mt-4 grid gap-3">
              {jobs.map((job) => {
                const jobLogs = logsByJob.get(job.id) || [];
                const sysLogs = systemLogsByJob.get(job.id) || [];
                const thumbs = jobImagesByJob.get(job.id) ?? [];
                const mapHref = `https://maps.google.com/?q=${encodeURIComponent(
                  [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ") || "Canton, MI"
                )}`;
                return (
                  <PipelineLeadCard
                    key={job.id}
                    job={{
                      id: job.id,
                      name: job.name,
                      phone: job.phone,
                      email: job.email,
                      car_make_model: job.car_make_model,
                      service_package: job.service_package,
                      status: job.status,
                      preferred_date: job.preferred_date,
                      preferred_time: job.preferred_time,
                      assigned_rep: job.assigned_rep,
                      claimed_by: job.claimed_by,
                      address: job.address,
                      city: job.city,
                      state: job.state,
                      zip: job.zip,
                      referred_by_code: job.referred_by_code ?? null,
                      referral_discount_amount: job.referral_discount_amount ?? null
                    }}
                    mapHref={mapHref}
                    thumbs={thumbs}
                    jobLogs={jobLogs.slice(0, 8).map((l) => ({ id: l.id, channel: l.channel, note: l.note }))}
                    sysLogs={sysLogs.slice(0, 8).map((s) => ({
                      id: s.id,
                      created_at: s.created_at,
                      actor_name: s.actor_name,
                      message: s.message
                    }))}
                    sortedReps={sortedReps.map((r) => ({ id: r.id, label: String(r.full_name || r.email) }))}
                    actorLabel={actorLabel}
                    profileCreatedBy={profile.full_name || profile.email}
                    showArchived={showArchived}
                    statusLabel={pipelineStatusLabel(job.status)}
                    statusClassName={pipelineStatusClass(job.status)}
                    statusSelectDefault={statusSelectValue(job.status)}
                  />
                );
              })}
              {!jobs.length ? (
                <div className="rounded-xl border border-white/10 bg-black/25 p-6 text-center text-sm text-slate-400">
                  <Clock3 className="mx-auto mb-2 size-7 text-slate-500" />
                  No jobs found yet.
                </div>
              ) : null}
            </div>
            </BatchJobsProvider>
          </section>

          {isAdmin && REFERRAL_PROGRAM_ENABLED ? (
            <section id="referrals" className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/12 to-black/40 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">Referrals & credits</h3>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
                When a guest enters a friend&apos;s code, <strong className="text-slate-200">$10 comes off</strong> their quoted total immediately.
                When you set that job to <strong className="text-slate-200">Completed</strong>, the code owner gets{" "}
                <strong className="text-slate-200">$10 added</strong> to <span className="font-mono text-slate-300">credit_balance</span> (once per
                referral). Rows flagged for abuse do not auto-credit — fix in Supabase if needed.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-white/15 text-slate-500">
                      <th className="py-2 pr-2 font-semibold uppercase tracking-wide">Status</th>
                      <th className="py-2 pr-2 font-semibold uppercase tracking-wide">Code</th>
                      <th className="py-2 pr-2 font-semibold uppercase tracking-wide">Referrer</th>
                      <th className="py-2 pr-2 font-semibold uppercase tracking-wide">Referee</th>
                      <th className="py-2 pr-2 font-semibold uppercase tracking-wide">−$ off job</th>
                      <th className="py-2 pr-2 font-semibold uppercase tracking-wide">+$ credit</th>
                      <th className="py-2 pr-2 font-semibold uppercase tracking-wide">Settled</th>
                      <th className="py-2 font-semibold uppercase tracking-wide">Job id</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => {
                      const ref = referralCustomers.get(r.referrer_customer_id);
                      const ru = referralCustomers.get(r.referee_customer_id);
                      return (
                        <tr key={r.id} className="border-b border-white/5 text-slate-300">
                          <td className="py-2 pr-2 align-top uppercase text-slate-400">{r.status || "—"}</td>
                          <td className="py-2 pr-2 align-top font-mono text-amber-100/90">{r.referrer_code_used || "—"}</td>
                          <td className="py-2 pr-2 align-top">
                            <div>{ref?.full_name || ref?.email || `${r.referrer_customer_id.slice(0, 8)}…`}</div>
                            <div className="text-slate-500">Credit bal ${Number(ref?.credit_balance ?? 0)}</div>
                          </td>
                          <td className="py-2 pr-2 align-top">{ru?.full_name || formatPhoneUs(ru?.phone) || ru?.email || "—"}</td>
                          <td className="py-2 pr-2 align-top tabular-nums">${Number(r.referee_discount_usd ?? 0)}</td>
                          <td className="py-2 pr-2 align-top tabular-nums">${Number(r.referrer_credit_usd ?? 0)}</td>
                          <td className="py-2 pr-2 align-top text-slate-500">
                            {r.rewards_settled_at ? new Date(r.rewards_settled_at).toLocaleString() : "—"}
                          </td>
                          <td className="py-2 align-top font-mono text-slate-400">{r.referee_first_job_id ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!referrals.length ? (
                  <p className="mt-4 text-sm text-slate-500">No referral activity logged yet — bookings with codes will appear here.</p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:col-span-2">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Vehicle mix</h3>
                  <DashboardCharts
                    sedanCount={mix.sedan}
                    suvCount={mix.suv}
                    sedanRevenue={revenueMix.sedan}
                    suvRevenue={revenueMix.suv}
                  />
                </div>
                <div className="w-full shrink-0 lg:w-72">
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Hot zones · ZIPs</h4>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                    From job addresses on file (excludes cancelled). Sorted by booking volume.
                  </p>
                  {hotZips.length ? (
                    <ul className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-3 text-[11px]">
                      {hotZips.map((z) => (
                        <li key={z.zip} className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                          <span className="font-mono text-slate-200">{z.zip}</span>
                          <span className="text-right text-slate-400">
                            <span className="tabular-nums text-slate-300">{z.count}</span> jobs
                            <span className="mx-1 text-slate-600">·</span>
                            <span className="tabular-nums text-emerald-200/80">${Math.round(z.completedRevenue)}</span> done
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 rounded-xl border border-dashed border-white/15 bg-black/20 p-4 text-[11px] text-slate-500">
                      No ZIP data yet — bookings with a ZIP on the job will populate this list.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {isAdmin ? (
              <section id="team" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:col-span-2">
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
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400 lg:col-span-2">
                Financials and team settings are restricted to admins.
              </section>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-400">
            Tap <span className="font-semibold text-amber-200/90">+</span> (bottom-right on mobile) for a quick phone lead. Pipeline cards collapse on small screens — tap the row to expand actions.
          </section>
        </section>
      </div>
      <AdminQuickFab initialPreferredDate={quickBookParam} />
    </main>
  );
}
