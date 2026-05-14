"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  batchArchiveCompletedJobsAction,
  batchAssignJobsAction,
  archiveAllCompletedJobsAction
} from "@/app/admin/actions";

type RepOption = { id: string; label: string };

const BatchCtx = createContext<{
  selected: Set<number>;
  toggle: (id: number) => void;
  clear: () => void;
} | null>(null);

export function useBatchJobSelection() {
  const ctx = useContext(BatchCtx);
  if (!ctx) throw new Error("BatchJobsProvider missing");
  return ctx;
}

export function BatchJobsProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const value = useMemo(() => ({ selected, toggle, clear }), [selected, toggle, clear]);

  return <BatchCtx.Provider value={value}>{children}</BatchCtx.Provider>;
}

export function JobRowSelectCheckbox({ jobId }: { jobId: number }) {
  const { selected, toggle } = useBatchJobSelection();
  const checked = selected.has(jobId);
  return (
    <label className="flex cursor-pointer items-start pt-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggle(jobId)}
        className="mt-1 size-4 rounded border-white/25 bg-black text-amber-500 focus:ring-amber-400/40"
        aria-label={`Select job ${jobId}`}
      />
    </label>
  );
}

export function BatchJobsToolbar({
  reps,
  actorName
}: {
  reps: RepOption[];
  actorName: string;
}) {
  const { selected, clear } = useBatchJobSelection();
  const idsStr = [...selected].sort((a, b) => a - b).join(",");

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-slate-400">
      <span className="font-semibold uppercase tracking-wide text-slate-500">Batch</span>
      <span className="tabular-nums text-slate-300">{selected.size} selected</span>
      <button type="button" onClick={clear} className="rounded border border-white/15 px-2 py-1 text-[10px] uppercase text-slate-300 hover:bg-white/[0.06]">
        Clear selection
      </button>

      <form action={batchAssignJobsAction} className="inline-flex flex-wrap items-center gap-1">
        <input type="hidden" name="job_ids" value={idsStr} />
        <input type="hidden" name="actor_name" value={actorName} />
        <select name="rep" className="max-w-[200px] rounded border border-white/15 bg-black px-2 py-1 text-[10px]" defaultValue="">
          <option value="" disabled>
            Assign to…
          </option>
          {reps.map((r) => (
            <option key={r.id} value={r.label}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!selected.size}
          className="rounded border border-blue-400/35 bg-blue-500/12 px-2 py-1 text-[10px] font-semibold uppercase text-blue-200 disabled:opacity-40"
        >
          Assign selection
        </button>
      </form>

      <form action={batchArchiveCompletedJobsAction} className="inline-flex items-center gap-1">
        <input type="hidden" name="job_ids" value={idsStr} />
        <input type="hidden" name="actor_name" value={actorName} />
        <button
          type="submit"
          disabled={!selected.size}
          className="rounded border border-violet-400/35 bg-violet-500/12 px-2 py-1 text-[10px] font-semibold uppercase text-violet-200 disabled:opacity-40"
        >
          Archive completed (selection)
        </button>
      </form>

      <form action={archiveAllCompletedJobsAction} className="inline-flex items-center gap-1">
        <input type="hidden" name="actor_name" value={actorName} />
        <button
          type="submit"
          className="rounded border border-amber-400/40 bg-amber-500/14 px-2 py-1 text-[10px] font-semibold uppercase text-amber-200"
        >
          Archive all completed
        </button>
      </form>
    </div>
  );
}
