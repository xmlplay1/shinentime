"use client";

import { createJobAdminAction } from "@/app/admin/actions";
import { BOOKING_ADDONS } from "@/lib/package-pricing";
import { REFERRAL_PROGRAM_ENABLED } from "@/lib/referral-flags";

export function CreateJobForm() {
  return (
    <form action={createJobAdminAction} className="grid max-w-xl gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
      <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">Create job</p>
      <input name="name" required placeholder="Customer name" className="rounded border border-white/15 bg-black px-2 py-1.5" />
      <input
        name="phone"
        required
        type="tel"
        placeholder="Phone * (10 digits — SMS)"
        className="rounded border border-white/15 bg-black px-2 py-1.5"
      />
      <input
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Email (optional)"
        className="rounded border border-white/15 bg-black px-2 py-1.5"
      />
      <input name="car_make_model" required placeholder="Vehicle make & model" className="rounded border border-white/15 bg-black px-2 py-1.5" />
      {REFERRAL_PROGRAM_ENABLED ? (
        <input
          name="referral_code"
          placeholder="Friend's referral code (optional, −$10)"
          className="rounded border border-white/15 bg-black px-2 py-1.5 font-mono uppercase"
        />
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <select name="service_package" required className="rounded border border-white/15 bg-black px-2 py-1.5">
          <option value="basic_interior">Basic Interior ($85 / $95)</option>
          <option value="full_interior">Full Interior ($120 / $135)</option>
          <option value="basic_exterior">Basic Exterior ($50 / $60)</option>
          <option value="ceramic_seal">Ceramic Seal ($85 / $95)</option>
          <option value="basic_combo">Basic In &amp; Out ($130 / $145)</option>
          <option value="full_combo">Full In &amp; Out ($165 / $185)</option>
        </select>
        <select name="vehicle_type" required className="rounded border border-white/15 bg-black px-2 py-1.5">
          <option value="sedan">Sedan</option>
          <option value="suv">SUV</option>
        </select>
      </div>
      <select name="vehicle_condition" required className="rounded border border-white/15 bg-black px-2 py-1.5">
        <option value="light">Condition: Light</option>
        <option value="moderate">Condition: Moderate (+$15 est.)</option>
        <option value="heavy">Condition: Heavy (+$35 est.)</option>
      </select>
      <fieldset className="rounded border border-white/10 p-2">
        <legend className="px-1 text-[10px] uppercase text-slate-500">Add-ons (optional)</legend>
        <div className="mt-2 grid gap-1">
          {BOOKING_ADDONS.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center justify-between gap-2 text-[11px] text-slate-300">
              <span className="flex items-center gap-2">
                <input type="checkbox" name="addon_id" value={a.id} className="rounded border-white/30" />
                {a.label}
              </span>
              <span className="tabular-nums text-amber-200/80">+${a.price}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <input name="preferred_date" required type="date" className="rounded border border-white/15 bg-black px-2 py-1.5" />
        <select name="preferred_time" required className="rounded border border-white/15 bg-black px-2 py-1.5">
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
      </div>
      <button type="submit" className="mt-1 rounded bg-amber-500/90 px-3 py-2 font-semibold uppercase tracking-wide text-black">
        Create job
      </button>
    </form>
  );
}
