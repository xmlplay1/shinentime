import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { normalizeEmail } from "@/lib/admin-format";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  computeLifetimeValue,
  fetchCustomerByEmail,
  searchCustomersQuery,
  listJobImagePublicUrls,
  type CustomerJobRow,
  type CustomerSummary
} from "@/app/admin/customer-helpers";
import Image from "next/image";

export default async function AdminCustomersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/admin");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const highlight = typeof params.email === "string" ? normalizeEmail(params.email) : "";

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return <main className="min-h-screen bg-black p-8 text-white">Missing SUPABASE_SERVICE_ROLE_KEY for customer lookup.</main>;
  }

  let matches: CustomerSummary[] = [];
  if (q.trim().length >= 2) {
    matches = await searchCustomersQuery(supabase, q);
  }

  let detail: {
    customer: CustomerSummary;
    jobs: CustomerJobRow[];
    jobPhotos: { jobId: number; photos: { name: string; url: string }[] }[];
  } | null = null;

  if (highlight) {
    const fetched = await fetchCustomerByEmail(supabase, highlight);
    if (fetched) {
      const jobPhotos = await Promise.all(
        fetched.jobs.map(async (job) => ({
          jobId: job.id,
          photos: await listJobImagePublicUrls(supabase, job.id)
        }))
      );
      detail = { ...fetched, jobPhotos };
    }
  }

  const ltv = detail ? computeLifetimeValue(detail.jobs) : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">CRM</p>
            <h1 className="mt-1 text-2xl font-semibold">Customer lookup</h1>
            <p className="mt-1 text-sm text-slate-400">Search by name or email · lifetime spend · photo archive per job.</p>
          </div>
          <Link href="/admin" className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
            ← Command Center
          </Link>
        </div>

        <form className="mt-8" action="/admin/customers" method="get">
          <label htmlFor="q" className="sr-only">
            Search customers
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Type name or email…"
              className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm outline-none ring-amber-400/40 focus:ring-2"
            />
            <button type="submit" className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-semibold text-black">
              Search
            </button>
          </div>
        </form>

        {matches.length > 0 ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Matches</h2>
            <ul className="mt-3 divide-y divide-white/10">
              {matches.map((c) => (
                <li key={c.id} className="py-3">
                  <Link
                    href={`/admin/customers?email=${encodeURIComponent(c.email)}&q=${encodeURIComponent(q)}`}
                    className="font-medium text-amber-200 hover:text-white"
                  >
                    {c.full_name || "Customer"}
                  </Link>
                  <p className="text-xs text-slate-400">{c.email}</p>
                  <p className="text-[11px] text-slate-500">Referral code: {c.referral_code}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : q.trim().length >= 2 ? (
          <p className="mt-6 text-sm text-slate-500">No customers match that search.</p>
        ) : null}

        {highlight ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            {!detail ? (
              <p className="text-slate-400">No customer profile for `{highlight}` yet. Profiles are created automatically on new bookings.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{detail.customer.full_name || "Customer"}</h2>
                    <p className="text-sm text-slate-400">{detail.customer.email}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/90">Lifetime value</p>
                    <p className="text-2xl font-bold tabular-nums">${ltv !== null ? ltv.toLocaleString() : "0"}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Code <span className="font-mono text-amber-200/90">{detail.customer.referral_code}</span> · Referral rewards unlock after a referred guest&apos;s first
                  completed detail.
                </p>

                <h3 className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Job history</h3>
                <ul className="mt-4 space-y-6">
                  {detail.jobs.map((job) => (
                    <li key={job.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-medium">{job.car_make_model || "Vehicle"}</p>
                          <p className="text-xs capitalize text-slate-400">{job.service_package || ""} · {job.status || ""}</p>
                          <p className="text-xs text-slate-500">{job.preferred_date || "—"}</p>
                        </div>
                      </div>
                      {(() => {
                        const entry = detail!.jobPhotos.find((p) => p.jobId === job.id);
                        const urls = entry?.photos || [];
                        if (!urls.length) {
                          return <p className="mt-3 text-xs text-slate-600">No uploads in job-images/job-{job.id}/ yet.</p>;
                        }
                        return (
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {urls.map((img) => (
                              <div key={img.url} className="relative aspect-square overflow-hidden rounded-lg border border-white/10">
                                <Image src={img.url} alt={img.name} fill sizes="120px" className="object-cover" unoptimized />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
