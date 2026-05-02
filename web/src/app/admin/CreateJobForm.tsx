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
    <form action={createJobAdminAction} className="grid max-w-2xl gap-3 rounded-xl border border-white/10 bg-black/40 p-4 text-xs">
      <p className="font-semibold uppercase tracking-wider text-amber-200/90">Manual lead</p>
      <p className="text-[11px] leading-relaxed text-slate-400">
        Use for Instagram, phone calls, or walk-ups. Double-check email — we use it for confirmations and the customer status link.
      </p>

      <input name="name" required placeholder="Customer name *" className="rounded border border-white/15 bg-black px-2 py-2" />

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          name="email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email *"
          className="rounded border border-white/15 bg-black px-2 py-2"
        />
        <input
          type="email"
          autoComplete="email"
          value={email2}
          onChange={(e) => setEmail2(e.target.value)}
          placeholder="Confirm email *"
          className="rounded border border-white/15 bg-black px-2 py-2"
        />
      </div>
      <input name="email_confirm" type="hidden" value={normalizeCustomerEmail(email2)} readOnly />

      <input name="phone" type="tel" placeholder="Phone (optional)" className="rounded border border-white/15 bg-black px-2 py-2" />

      <div className="grid gap-2 sm:grid-cols-2">
        <input name="address" placeholder="Street address (optional)" className="rounded border border-white/15 bg-black px-2 py-2" />
        <input name="city" placeholder="City (optional)" className="rounded border border-white/15 bg-black px-2 py-2" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input name="state" placeholder="State" className="rounded border border-white/15 bg-black px-2 py-2 sm:col-span-1" />
        <input name="zip" placeholder="ZIP" className="rounded border border-white/15 bg-black px-2 py-2 sm:col-span-1" />
        <input
          name="lead_source"
          placeholder="Source e.g. Instagram, referral"
          className="rounded border border-white/15 bg-black px-2 py-2 sm:col-span-2"
        />
      </div>

      <input name="car_make_model" required placeholder="Vehicle make & model *" className="rounded border border-white/15 bg-black px-2 py-2" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select name="service_package" required className="rounded border border-white/15 bg-black px-2 py-2 sm:col-span-2">
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
        </select>
        <select name="vehicle_type" required className="rounded border border-white/15 bg-black px-2 py-2 sm:col-span-2">
          <option value="sedan">Sedan</option>
          <option value="suv">SUV</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input name="preferred_date" required type="date" className="rounded border border-white/15 bg-black px-2 py-2" />
        <select name="preferred_time" required className="rounded border border-white/15 bg-black px-2 py-2">
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
      </div>

      <textarea
        name="notes"
        rows={3}
        placeholder="Internal notes (optional) — pricing discussed, gate code, etc."
        className="resize-y rounded border border-white/15 bg-black px-2 py-2 text-xs"
      />

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        Save lead to pipeline
      </button>
    </form>
  );
}
