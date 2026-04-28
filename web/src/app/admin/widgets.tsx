"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  sedanCount: number;
  suvCount: number;
};

export function DashboardCharts({ sedanCount, suvCount }: Props) {
  const data = [
    { type: "Sedans", count: sedanCount },
    { type: "SUVs", count: suvCount }
  ];

  return (
    <div className="mt-4 h-64 rounded-xl border border-white/10 bg-black/30 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
          <XAxis dataKey="type" stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} stroke="#94a3b8" tickLine={false} axisLine={false} width={30} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "rgba(8, 12, 20, 0.92)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: "0.75rem",
              color: "#e2e8f0"
            }}
          />
          <Bar dataKey="count" fill="#d4af37" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
