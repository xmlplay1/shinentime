import { format } from "date-fns";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const timeLabel: Record<string, string> = {
  morning: "Morning (8am–12pm)",
  afternoon: "Afternoon (12pm–4pm)",
  evening: "Evening (4pm–8pm)"
};

export default async function BookingStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = decodeURIComponent(String(token || "")).trim();
  if (!raw) notFound();

  const supabase = createAdminClient();
  if (!supabase) notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id,name,car_make_model,service_package,status,preferred_date,preferred_time,address,city,state,zip"
    )
    .eq("customer_portal_token", raw)
    .maybeSingle();

  if (!job) notFound();

  const status = String(job.status || "Pending")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
  const prefDate = String(job.preferred_date || "").trim();
  let datePretty = prefDate || "Being scheduled";
  if (prefDate) {
    try {
      datePretty = format(new Date(`${prefDate}T12:00:00`), "PPP");
    } catch {
      /* keep raw */
    }
  }
  const win = String(job.preferred_time || "").toLowerCase();
  const winLabel = timeLabel[win] || job.preferred_time || "";
  const pkg = String(job.service_package || "").toUpperCase() || "—";
  const addressLine = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black px-4 py-16 text-white">
      <div className="mx-auto max-w-lg rounded-3xl border border-white/12 bg-white/[0.05] p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Shine N Time</p>
        <h1 className="mt-2 text-2xl font-semibold">Your booking status</h1>
        <p className="mt-2 text-sm text-slate-400">
          Hi {String(job.name || "there").split(" ")[0]}, here is what we have on file. We will reach out by email if anything
          changes.
        </p>

        <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-black/35 p-5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Status</span>
            <span className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-amber-100">
              {status}
            </span>
          </div>
          <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
            <span className="text-xs uppercase tracking-widest text-slate-500">Vehicle</span>
            <span className="font-medium">{job.car_make_model || "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-slate-500">Package</span>
            <span className="font-medium">{pkg}</span>
          </div>
          <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
            <span className="text-xs uppercase tracking-widest text-slate-500">Preferred appointment</span>
            <span className="font-medium">{datePretty}</span>
            {winLabel ? <span className="text-slate-400">{winLabel}</span> : null}
          </div>
          {addressLine ? (
            <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
              <span className="text-xs uppercase tracking-widest text-slate-500">Service address</span>
              <span className="font-medium text-slate-300">{addressLine}</span>
            </div>
          ) : null}
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Save this link to check updates anytime. For changes, reply to your confirmation email or call Shine N Time.
        </p>
      </div>
    </main>
  );
}
