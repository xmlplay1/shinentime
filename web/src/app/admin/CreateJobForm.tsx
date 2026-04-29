"use client";

import { useMemo, useState } from "react";
import { createJobAdminAction } from "@/app/admin/actions";
import { isStrictEmail, normalizeCustomerEmail } from "@/lib/email-validation";

export function CreateJobForm() {
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");

  const canSubmit = useMemo(() => {
    const a = normalizeCustomerEmail(email);
    const b = normalizeCustomerEmail(email2);
    return isStrictEmail(email) && isStrictEmail(email2) && a === b;
  }, [email, email2]);

  return (
    <form action={createJobAdminAction} className="grid max-w-xl gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
      <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">Create job</p>
      <input name="name" required placeholder="Customer name" className="rounded border border-white/15 bg-black px-2 py-1.5" />
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email *"
          className="rounded border border-white/15 bg-black px-2 py-1.5"
        />
        <input
          type="email"
          autoComplete="email"
          value={email2}
          onChange={(e) => setEmail2(e.target.value)}
          placeholder="Confirm email *"
          className="rounded border border-white/15 bg-black px-2 py-1.5"
        />
      </div>
      <input name="email_confirm" type="hidden" value={normalizeCustomerEmail(email2)} readOnly />
      <input name="phone" type="tel" placeholder="Phone (optional)" className="rounded border border-white/15 bg-black px-2 py-1.5" />
      <input name="car_make_model" required placeholder="Vehicle make & model" className="rounded border border-white/15 bg-black px-2 py-1.5" />
      <div className="grid grid-cols-2 gap-2">
        <select name="service_package" required className="rounded border border-white/15 bg-black px-2 py-1.5">
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
        </select>
        <select name="vehicle_type" required className="rounded border border-white/15 bg-black px-2 py-1.5">
          <option value="sedan">Sedan</option>
          <option value="suv">SUV</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="preferred_date" required type="date" className="rounded border border-white/15 bg-black px-2 py-1.5" />
        <select name="preferred_time" required className="rounded border border-white/15 bg-black px-2 py-1.5">
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-1 rounded bg-amber-500/90 px-3 py-2 font-semibold uppercase tracking-wide text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        Create job
      </button>
    </form>
  );
}
