"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { normalizePhone } from "@/lib/phone";

const GOAL = 5;

export function ReferralStatus() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  const check = async () => {
    const n = normalizePhone(phone);
    if (n.length < 10) {
      setError("Enter a valid phone number.");
      return;
    }
    setLoading(true);
    setError("");
    setCount(null);
    try {
      const res = await fetch(`/api/referrals?phone=${encodeURIComponent(n)}`);
      const data = (await res.json()) as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not load status.");
      setCount(typeof data.count === "number" ? data.count : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const pct = count === null ? 0 : Math.min(100, (count / GOAL) * 100);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Referral status</p>
      <p className="mt-1 text-sm text-slate-400">Check progress toward your next complimentary detail.</p>
      <div className="mt-4 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Your phone number"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none ring-blue-500/30 focus:ring-2"
        />
        <button
          type="button"
          onClick={() => void check()}
          disabled={loading}
          className="shrink-0 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          {loading ? "…" : "Check"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      {count !== null ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Successful referrals</span>
            <span className="font-mono text-slate-200">
              {count} / {GOAL}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
