"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PreferredTime = "morning" | "afternoon" | "evening";

type Props = {
  selected: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  preferredTime: PreferredTime | "";
  onPreferredTime: (t: PreferredTime) => void;
};

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function PreferredDateTime({ selected, onSelect, preferredTime, onPreferredTime }: Props) {
  const today = startOfTodayLocal();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-300">Preferred date</p>
        <p className="mt-1 text-xs text-slate-500">Sundays are unavailable. Past dates are disabled.</p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "mt-4 inline-flex w-full max-w-md items-center justify-between rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-left text-sm text-white outline-none ring-blue-500/40 transition hover:border-white/20 focus-visible:ring-2",
                !selected && "text-slate-500"
              )}
            >
              {selected ? format(selected, "PPP") : "Pick a date…"}
              <span className="text-xs text-slate-500">▾</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => {
                onSelect(d);
                setOpen(false);
              }}
              disabled={[
                { before: today },
                (date) => date.getDay() === 0
              ]}
              defaultMonth={today}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-300">Preferred time</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              { id: "morning" as const, label: "Morning", sub: "8am – 12pm" },
              { id: "afternoon" as const, label: "Afternoon", sub: "12pm – 4pm" },
              { id: "evening" as const, label: "Evening", sub: "4pm – 8pm" }
            ] as const
          ).map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => onPreferredTime(slot.id)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition",
                preferredTime === slot.id
                  ? "border-blue-400/60 bg-blue-500/15 text-white"
                  : "border-white/10 bg-black/40 text-slate-300 hover:border-white/20"
              )}
            >
              <span className="block text-xs font-bold uppercase tracking-widest">{slot.label}</span>
              <span className="mt-1 block text-[11px] text-slate-500">{slot.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
