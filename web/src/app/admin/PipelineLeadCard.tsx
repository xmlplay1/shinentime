"use client";

import { useState } from "react";
import { ChevronDown, MapPin, MessageSquare, Phone } from "lucide-react";
import {
  addCommunicationLogAction,
  archiveJobAction,
  claimJobAction,
  deleteJobAction,
  restoreArchivedJobAction,
  updateJobStatusAction,
  uploadJobImageAction
} from "@/app/admin/actions";
import { JobPhotoGallery } from "@/app/admin/JobPhotoGallery";
import { JobRowSelectCheckbox } from "@/app/admin/BatchJobsControls";
import { formatPhoneUs, normalizeEmail } from "@/lib/admin-format";

export type PipelineLeadCardProps = {
  job: {
    id: number;
    name: string | null;
    phone: string | null;
    email: string | null;
    car_make_model: string | null;
    service_package: string | null;
    status: string | null;
    preferred_date: string | null;
    preferred_time: string | null;
    assigned_rep: string | null;
    claimed_by: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    referred_by_code: string | null;
    referral_discount_amount: number | null;
  };
  mapHref: string;
  thumbs: { name: string; url: string }[];
  jobLogs: { id: number; channel: string; note: string }[];
  sysLogs: { id: number; created_at: string; actor_name: string | null; message: string }[];
  sortedReps: { id: string; label: string }[];
  actorLabel: string;
  profileCreatedBy: string;
  showArchived: boolean;
  statusLabel: string;
  statusClassName: string;
  statusSelectDefault: string;
};

const iconBtn =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] text-white shadow-sm outline-none ring-offset-2 ring-offset-black transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-400/70 max-lg:active:scale-[0.97]";
const touchSelect =
  "rounded-md border border-white/15 bg-black/60 max-lg:min-h-[48px] max-lg:w-full max-lg:px-3 max-lg:py-3 max-lg:text-sm lg:px-2 lg:py-1 lg:text-xs";
const touchRow = "flex max-lg:flex-col max-lg:gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2";

export function PipelineLeadCard(props: PipelineLeadCardProps) {
  const [open, setOpen] = useState(false);
  const {
    job,
    mapHref,
    thumbs,
    jobLogs,
    sysLogs,
    sortedReps,
    actorLabel,
    profileCreatedBy,
    showArchived,
    statusLabel,
    statusClassName,
    statusSelectDefault
  } = props;

  const pkgLine = `${job.car_make_model || "Vehicle TBD"} · ${(job.service_package || "package").toUpperCase()}`;

  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-3 max-lg:p-3 lg:p-4">
      <div className="flex gap-2 lg:gap-3">
        <div className="pt-1">
          <JobRowSelectCheckbox jobId={job.id} />
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="flex w-full items-start gap-2 rounded-lg text-left outline-none ring-offset-2 ring-offset-black focus-visible:ring-2 focus-visible:ring-amber-400/60 lg:pointer-events-none lg:cursor-default lg:gap-3"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{job.name || "Unknown Customer"}</p>
                <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] lg:text-xs ${statusClassName}`}>{statusLabel}</span>
              </div>
              <p className="text-xs text-slate-400 lg:hidden">{pkgLine}</p>
              <p className="hidden text-xs text-slate-400 lg:block">
                {formatPhoneUs(job.phone)} · {normalizeEmail(job.email) || "no email"}
              </p>
              <p className="hidden text-xs text-slate-400 lg:block">{pkgLine}</p>
              {job.referred_by_code ? (
                <p className="hidden text-[10px] text-amber-200/90 lg:block">
                  Referral <span className="font-mono">{job.referred_by_code}</span> · −$
                  {Number(job.referral_discount_amount ?? 10)} quote discount
                </p>
              ) : null}
            </div>
            <ChevronDown
              className={`mt-0.5 size-5 shrink-0 text-slate-400 transition lg:hidden ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>

          <div className="mt-3 flex flex-wrap items-center gap-2 lg:mt-3">
            <a href={mapHref} target="_blank" rel="noreferrer" className={iconBtn} title="Navigate" aria-label="Open directions in Maps">
              <MapPin className="size-5 text-sky-300" strokeWidth={2.25} />
            </a>
            <a href={`tel:${job.phone || ""}`} className={iconBtn} title="Call" aria-label="Call customer">
              <Phone className="size-5 text-emerald-300" strokeWidth={2.25} />
            </a>
            <a href={`sms:${job.phone || ""}`} className={iconBtn} title="SMS" aria-label="Send text message">
              <MessageSquare className="size-5 text-violet-300" strokeWidth={2.25} />
            </a>
            <span className="hidden text-[10px] uppercase tracking-wide text-slate-600 lg:inline lg:flex-1"> </span>
          </div>

          <div className={`mt-3 space-y-3 ${open ? "block" : "hidden"} lg:block`}>
            <p className="text-xs text-slate-400 lg:hidden">
              {formatPhoneUs(job.phone)} · {normalizeEmail(job.email) || "no email"}
            </p>
            {job.referred_by_code ? (
              <p className="text-[10px] text-amber-200/90 lg:hidden">
                Referral <span className="font-mono">{job.referred_by_code}</span> · −$
                {Number(job.referral_discount_amount ?? 10)} quote discount
              </p>
            ) : null}

            <div className="grid gap-2 text-xs text-slate-300 md:grid-cols-2">
              <p>Date: {job.preferred_date || "TBD"} · {job.preferred_time || "TBD"}</p>
              <p>Assigned: {job.assigned_rep || job.claimed_by || "Unassigned"}</p>
            </div>

            <div className={touchRow}>
              <form action={uploadJobImageAction} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/15 px-2 py-2 max-lg:w-full max-lg:justify-between lg:py-1">
                <input type="hidden" name="job_id" value={job.id} />
                <input type="hidden" name="type" value="before" />
                <input name="image" type="file" accept="image/*" capture="environment" className="max-w-[min(100%,220px)] text-[10px] lg:w-[130px]" />
                <button type="submit" className="rounded-md border border-white/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide lg:py-1">
                  Photos
                </button>
              </form>

              <form action={claimJobAction} className={`${touchRow} rounded-lg border border-white/15 px-2 py-2 lg:inline-flex lg:items-center`}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="phone" value={job.phone || ""} />
                <input type="hidden" name="actor_name" value={actorLabel} />
                <select name="rep" className={touchSelect}>
                  <option value="">Assign rep</option>
                  {sortedReps.map((r) => (
                    <option key={r.id} value={r.label}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button type="submit" className="rounded-md border border-white/20 bg-white/[0.06] px-4 py-3 text-[11px] font-semibold uppercase lg:py-1 lg:text-[10px]">
                  Save assign
                </button>
              </form>
            </div>

            <JobPhotoGallery items={thumbs} />

            <div className={touchRow}>
              <form action={updateJobStatusAction} className={`${touchRow} w-full lg:w-auto`}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="actor_name" value={actorLabel} />
                <select name="status" defaultValue={statusSelectDefault} className={`${touchSelect} lg:max-w-[200px]`}>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Archived">Archived</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md border border-amber-400/35 bg-amber-500/15 px-4 py-3 text-[11px] font-semibold uppercase max-lg:w-full lg:py-1 lg:text-[10px]"
                >
                  Update status
                </button>
              </form>

              <form action={addCommunicationLogAction} className={`${touchRow} w-full flex-wrap rounded-lg border border-white/10 bg-black/20 p-2`}>
                <input type="hidden" name="job_id" value={job.id} />
                <input type="hidden" name="created_by" value={profileCreatedBy} />
                <select name="channel" className={touchSelect}>
                  <option value="sms">sms</option>
                  <option value="call">call</option>
                  <option value="email">email</option>
                  <option value="internal">internal</option>
                </select>
                <input
                  name="note"
                  required
                  placeholder="Communication note"
                  className="max-lg:min-h-[48px] flex-1 rounded-md border border-white/15 bg-black px-3 py-3 text-sm lg:min-w-[140px] lg:py-1 lg:text-[10px]"
                />
                <button
                  type="submit"
                  className="rounded-md border border-blue-400/40 bg-blue-500/12 px-4 py-3 text-[11px] uppercase max-lg:w-full lg:py-1 lg:text-[10px]"
                >
                  Log
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2">
              <form action={deleteJobAction}>
                <input type="hidden" name="id" value={job.id} />
                <button
                  type="submit"
                  className="rounded-md border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-[11px] font-semibold uppercase text-rose-100 lg:py-1 lg:text-[10px]"
                >
                  Delete
                </button>
              </form>
              <form action={showArchived ? restoreArchivedJobAction : archiveJobAction}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="actor_name" value={actorLabel} />
                <button
                  type="submit"
                  className="rounded-md border border-violet-400/35 bg-violet-500/10 px-4 py-3 text-[10px] font-semibold uppercase text-violet-100 lg:py-1"
                >
                  {showArchived ? "Unarchive" : "Archive"}
                </button>
              </form>
            </div>

            <div className="rounded-md border border-cyan-500/15 bg-cyan-950/20 p-2 text-[11px] text-slate-400">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-500/80">System log</p>
              {sysLogs.length ? (
                sysLogs.slice(0, 4).map((sl) => (
                  <p key={sl.id} className="mt-1 border-t border-white/5 pt-1 first:mt-0 first:border-t-0 first:pt-0">
                    <span className="text-slate-500">{new Date(sl.created_at).toLocaleString()}</span>
                    {" · "}
                    <span className="text-cyan-200/90">{sl.actor_name || "—"}</span>
                    {": "}
                    {sl.message}
                  </p>
                ))
              ) : (
                <p className="mt-1 text-slate-600">No status or assignment events logged yet.</p>
              )}
            </div>

            <div className="rounded-md border border-white/10 bg-black/35 p-2 text-[11px] text-slate-400">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Communication log</p>
              {jobLogs.length ? (
                jobLogs.slice(0, 3).map((log) => (
                  <p key={log.id} className="mt-1">
                    <span className="uppercase text-slate-500">{log.channel}</span>: {log.note}
                  </p>
                ))
              ) : (
                <p>No communication logs yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
