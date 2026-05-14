"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Mode = "count" | "revenue";

type Props = {
  sedanCount: number;
  suvCount: number;
  sedanRevenue: number;
  suvRevenue: number;
};

export function DashboardCharts({ sedanCount, suvCount, sedanRevenue, suvRevenue }: Props) {
  const [mode, setMode] = useState<Mode>("count");

  const data = useMemo(() => {
    if (mode === "count") {
      return [
        { type: "Sedans", value: sedanCount },
        { type: "SUVs", value: suvCount }
      ];
    }
    return [
      { type: "Sedans", value: Math.round(sedanRevenue * 100) / 100 },
      { type: "SUVs", value: Math.round(suvRevenue * 100) / 100 }
    ];
  }, [mode, sedanCount, suvCount, sedanRevenue, suvRevenue]);

  const maxVal = mode === "count" ? Math.max(sedanCount, suvCount, 1) : Math.max(sedanRevenue, suvRevenue, 1);
  const hasData =
    mode === "count" ? sedanCount + suvCount > 0 : sedanRevenue + suvRevenue > 0;

  const tickFormatter = mode === "revenue" ? (v: number) => `$${Number(v).toLocaleString()}` : (v: number) => String(v);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">View</span>
        <div className="inline-flex rounded-lg border border-white/15 bg-black/40 p-0.5">
          <button
            type="button"
            onClick={() => setMode("count")}
            className={`rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
              mode === "count" ? "bg-amber-500/25 text-amber-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Job count
          </button>
          <button
            type="button"
            onClick={() => setMode("revenue")}
            className={`rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
              mode === "revenue" ? "bg-emerald-500/25 text-emerald-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Revenue
          </button>
        </div>
        <p className="text-[10px] text-slate-500">
          {mode === "count" ? "Active leads by body type (excludes cancelled)." : "Closed revenue from Completed jobs only."}
        </p>
      </div>

      <div className="h-64 rounded-xl border border-white/10 bg-black/30 p-3">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
              <XAxis dataKey="type" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                width={mode === "revenue" ? 44 : 30}
                tickFormatter={tickFormatter}
                domain={mode === "count" ? [0, "dataMax + 1"] : [0, "auto"]}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                formatter={(value: unknown) => {
                  const n = typeof value === "number" ? value : Number(value);
                  const safe = Number.isFinite(n) ? n : 0;
                  return mode === "revenue"
                    ? [`$${safe.toLocaleString()}`, "Total"]
                    : [safe, "Jobs"];
                }}
                contentStyle={{
                  background: "rgba(8, 12, 20, 0.92)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: "0.75rem",
                  color: "#e2e8f0"
                }}
              />
              <Bar dataKey="value" fill={mode === "revenue" ? "#34d399" : "#d4af37"} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/15 text-center">
            <p className="text-sm text-slate-400">
              {mode === "revenue" ? "No completed revenue yet for this split." : "No vehicle data yet. Jobs will appear here once added."}
            </p>
          </div>
        )}
      </div>
      {mode === "count" && maxVal > 0 ? (
        <p className="text-[10px] text-slate-600">
          Peak axis scaled to <span className="tabular-nums text-slate-400">{maxVal}</span> jobs.
        </p>
      ) : null}
    </div>
  );
}
