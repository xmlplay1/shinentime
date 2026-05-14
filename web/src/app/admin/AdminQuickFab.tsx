"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { quickPhoneLeadAction } from "@/app/admin/actions";

type Props = {
  /** Prefill preferred date (YYYY-MM-DD) when opened via calendar shortcut */
  initialPreferredDate?: string;
};

const PACKAGES = [
  { id: "basic_interior", label: "Basic Interior" },
  { id: "full_interior", label: "Full Interior" },
  { id: "basic_exterior", label: "Basic Exterior" },
  { id: "ceramic_seal", label: "Ceramic Seal" },
  { id: "basic_combo", label: "Basic In & Out" },
  { id: "full_combo", label: "Full In & Out" }
] as const;

export function AdminQuickFab({ initialPreferredDate }: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openedFromUrlRef = useRef(false);

  useEffect(() => {
    if (!initialPreferredDate || openedFromUrlRef.current) return;
    const d = initialPreferredDate.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      openedFromUrlRef.current = true;
      queueMicrotask(() => setOpen(true));
    }
  }, [initialPreferredDate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) dialogRef.current?.querySelector<HTMLInputElement>("input[name=name]")?.focus();
  }, [open]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-[60] flex size-14 items-center justify-center rounded-full border border-amber-400/50 bg-gradient-to-br from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-900/40 outline-none ring-offset-2 ring-offset-black transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-amber-300 lg:bottom-6 lg:right-8"
        aria-label="Quick lead"
      >
        <Plus className="size-7 stroke-[2.5]" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-lead-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 id="quick-lead-title" className="text-lg font-semibold text-white">
                  Quick phone lead
                </h2>
                <p className="mt-1 text-xs text-slate-400">Creates a Pending job (sedan estimate). Fine-tune in pipeline.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/15 p-2 text-slate-400 hover:bg-white/[0.06]"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <form action={quickPhoneLeadAction} className="mt-5 grid gap-3">
              <label className="grid gap-1 text-xs">
                <span className="text-slate-400">Name</span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  className="min-h-[48px] rounded-lg border border-white/15 bg-black px-3 text-sm text-white"
                  placeholder="Customer name"
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-slate-400">Mobile (10 digits)</span>
                <input
                  name="phone"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="min-h-[48px] rounded-lg border border-white/15 bg-black px-3 text-sm text-white"
                  placeholder="7344191846"
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-slate-400">Vehicle</span>
                <input
                  name="car_make_model"
                  className="min-h-[48px] rounded-lg border border-white/15 bg-black px-3 text-sm text-white"
                  placeholder="2022 Honda CR-V"
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-slate-400">Package</span>
                <select name="service_package" className="min-h-[48px] rounded-lg border border-white/15 bg-black px-3 text-sm text-white">
                  {PACKAGES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-slate-400">Service date</span>
                <input
                  name="preferred_date"
                  type="date"
                  required
                  min={today}
                  defaultValue={(initialPreferredDate || "").slice(0, 10) || today}
                  className="min-h-[48px] rounded-lg border border-white/15 bg-black px-3 text-sm text-white"
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-slate-400">Time window</span>
                <select name="preferred_time" defaultValue="afternoon" className="min-h-[48px] rounded-lg border border-white/15 bg-black px-3 text-sm text-white">
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-[48px] flex-1 rounded-xl border border-white/15 px-4 text-sm font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] flex-1 rounded-xl bg-amber-500 px-4 text-sm font-bold uppercase tracking-wide text-black"
                >
                  Save lead
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
