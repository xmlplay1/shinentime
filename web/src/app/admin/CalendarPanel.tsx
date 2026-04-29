"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { formatUsPhone } from "@/lib/admin-format";

type JobItem = {
  id: number;
  name: string | null;
  phone: string | null;
  email?: string | null;
  status: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  service_package: string | null;
  car_make_model: string | null;
};

const statusStyle: Record<string, string> = {
  pending: "bg-amber-500/25 text-amber-200 border-amber-500/35",
  confirmed: "bg-emerald-500/25 text-emerald-200 border-emerald-500/35",
  completed: "bg-blue-500/25 text-blue-200 border-blue-500/35",
  cancelled: "bg-rose-500/25 text-rose-200 border-rose-500/35"
};

function statusColor(status: string): string {
  return statusStyle[String(status || "").toLowerCase()] || "bg-zinc-500/20 text-zinc-200 border-zinc-500/35";
}

type CalendarPanelProps = {
  jobs: JobItem[];
  rescheduleAction: (formData: FormData) => Promise<void>;
  cancelAction: (formData: FormData) => Promise<void>;
};

export function CalendarPanel({ jobs, rescheduleAction, cancelAction }: CalendarPanelProps) {
  const jobsByDate = useMemo(() => {
    const map = new Map<string, JobItem[]>();
    for (const job of jobs) {
      if (!job.preferred_date) continue;
      const key = job.preferred_date;
      const curr = map.get(key) || [];
      curr.push(job);
      map.set(key, curr);
    }
    return map;
  }, [jobs]);

  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const selectedKey = selected ? selected.toISOString().slice(0, 10) : "";
  const selectedJobs = jobsByDate.get(selectedKey) || [];

  const modifiers = useMemo(() => {
    const pending: Date[] = [];
    const confirmed: Date[] = [];
    const completed: Date[] = [];
    const cancelled: Date[] = [];

    jobsByDate.forEach((items, dateStr) => {
      const d = new Date(`${dateStr}T12:00:00`);
      const statuses = new Set(items.map((i) => String(i.status || "").toLowerCase()));
      if (statuses.has("pending")) pending.push(d);
      if (statuses.has("confirmed")) confirmed.push(d);
      if (statuses.has("completed")) completed.push(d);
      if (statuses.has("cancelled")) cancelled.push(d);
    });
    return { pending, confirmed, completed, cancelled };
  }, [jobsByDate]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Visual Schedule Calendar</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={setSelected}
            showOutsideDays
            modifiers={modifiers}
            modifiersClassNames={{
              pending: "rdp-day_pending",
              confirmed: "rdp-day_confirmed",
              completed: "rdp-day_completed",
              cancelled: "rdp-day_cancelled"
            }}
            className="mx-auto [&_.rdp-day]:text-white [&_.rdp-caption_label]:text-white [&_.rdp-weekday]:text-slate-400 [&_.rdp-day_button]:text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-amber-500/40 bg-amber-500/20 px-2 py-1 text-amber-200">Pending</span>
            <span className="rounded border border-emerald-500/40 bg-emerald-500/20 px-2 py-1 text-emerald-200">Confirmed</span>
            <span className="rounded border border-blue-500/40 bg-blue-500/20 px-2 py-1 text-blue-200">Completed</span>
            <span className="rounded border border-rose-500/40 bg-rose-500/20 px-2 py-1 text-rose-200">Cancelled</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            {selected ? `Jobs for ${selected.toLocaleDateString()}` : "Tap a date"}
          </p>
          <div className="mt-3 space-y-2">
            {selectedJobs.length ? (
              selectedJobs.map((job) => (
                <article key={job.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{job.name || "Unknown"}</p>
                      <p className="text-xs text-slate-300">{formatUsPhone(job.phone)}</p>
                      <p className="text-xs text-slate-400">{job.email || "no email"}</p>
                      <p className="text-xs text-slate-400">{job.car_make_model || "Vehicle pending"}</p>
                    </div>
                    <span className={`rounded border px-2 py-1 text-[11px] uppercase ${statusColor(job.status || "pending")}`}>
                      {job.status || "pending"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    {job.service_package || "Package TBD"} · {job.preferred_time || "Time TBD"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <form action={rescheduleAction} className="inline-flex items-center gap-2 rounded-md border border-white/15 px-2 py-1">
                      <input type="hidden" name="id" value={job.id} />
                      <input
                        name="preferred_date"
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        defaultValue={job.preferred_date || ""}
                        className="rounded bg-black px-2 py-1 text-[11px] text-white"
                      />
                      <select
                        name="preferred_time"
                        defaultValue={(job.preferred_time || "morning").toLowerCase()}
                        className="rounded bg-black px-2 py-1 text-[11px] text-white"
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                      </select>
                      <button className="text-[11px] font-semibold uppercase">Reschedule</button>
                    </form>
                    <form action={cancelAction}>
                      <input type="hidden" name="id" value={job.id} />
                      <button className="rounded-md border border-rose-400/35 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold uppercase text-rose-100">
                        Cancel
                      </button>
                    </form>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-400">No jobs on this date yet.</p>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        .rdp-day_pending .rdp-day_button {
          background: rgba(245, 158, 11, 0.22);
          border: 1px solid rgba(245, 158, 11, 0.45);
        }
        .rdp-day_confirmed .rdp-day_button {
          background: rgba(16, 185, 129, 0.22);
          border: 1px solid rgba(16, 185, 129, 0.45);
        }
        .rdp-day_completed .rdp-day_button {
          background: rgba(59, 130, 246, 0.22);
          border: 1px solid rgba(59, 130, 246, 0.45);
        }
        .rdp-day_cancelled .rdp-day_button {
          background: rgba(244, 63, 94, 0.22);
          border: 1px solid rgba(244, 63, 94, 0.45);
        }
      `}</style>
    </section>
  );
}
