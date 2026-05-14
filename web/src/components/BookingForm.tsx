"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { normalizePhone } from "@/lib/phone";
import { PreferredDateTime, type PreferredTime } from "@/components/PreferredDateTime";
import {
  BOOKING_ADDONS,
  PACKAGE_PRICING,
  bookingEstimateTotal,
  conditionLaborAdjustment,
  priceFor,
  type AddonId,
  type PackageId,
  type VehicleCategory
} from "@/lib/package-pricing";
import { isStrictEmail, normalizeCustomerEmail } from "@/lib/email-validation";
import { prettifyPackage } from "@/lib/email-templates";

const STEPS = [
  "name",
  "phone",
  "email",
  "address",
  "car",
  "vehicle",
  "condition",
  "service",
  "addons",
  "schedule",
  "referral",
  "review"
] as const;

function clientFingerprint(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = `${navigator.userAgent}|${navigator.language}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
    return btoa(unescape(encodeURIComponent(raw))).slice(0, 120);
  } catch {
    return "";
  }
}

const services: readonly {
  readonly id: PackageId;
  readonly label: string;
}[] = [
  { id: "basic_interior", label: "Basic Interior" },
  { id: "full_interior", label: "Full Interior" },
  { id: "basic_exterior", label: "Basic Exterior" },
  { id: "ceramic_seal", label: "Ceramic Seal" },
  { id: "basic_combo", label: "Basic In & Out" },
  { id: "full_combo", label: "Full In & Out" }
];

const pkgLabel = (id: PackageId) => services.find((s) => s.id === id)?.label ?? id;

const timeLabels: Record<PreferredTime, string> = {
  morning: "Morning (8am – 12pm)",
  afternoon: "Afternoon (12pm – 4pm)",
  evening: "Evening (4pm – 8pm)"
};

function selectedAddonIds(map: Partial<Record<AddonId, boolean>>): AddonId[] {
  return BOOKING_ADDONS.filter((a) => map[a.id]).map((a) => a.id);
}

function buildLocalEstimateLines(
  pkg: PackageId,
  vt: VehicleCategory,
  addonIds: readonly AddonId[],
  vehicleCondition: string
): string[] {
  const lines: string[] = [`${prettifyPackage(pkg)} (package): $${priceFor(pkg, vt)}`];
  for (const id of addonIds) {
    const row = BOOKING_ADDONS.find((a) => a.id === id);
    if (row) lines.push(`${row.label}: +$${row.price}`);
  }
  const adj = conditionLaborAdjustment(vehicleCondition);
  if (adj > 0) lines.push(`Soil level (${vehicleCondition}): +$${adj}`);
  return lines;
}

export function BookingForm() {
  const searchParams = useSearchParams();
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [car, setCar] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory | "">("");
  const [vehicleCondition, setVehicleCondition] = useState<"light" | "moderate" | "heavy" | "">("");
  const [service, setService] = useState<PackageId | "">("");
  const [addonMap, setAddonMap] = useState<Partial<Record<AddonId, boolean>>>({});
  const [preferredDate, setPreferredDate] = useState<Date | undefined>(undefined);
  const [preferredTime, setPreferredTime] = useState<PreferredTime | "">("");
  const [referredBy, setReferredBy] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferredBy((prev) => prev || ref.trim().toUpperCase());
  }, [searchParams]);

  const step = STEPS[stepIndex];
  const progress = useMemo(() => ((stepIndex + 1) / STEPS.length) * 100, [stepIndex]);
  const isReviewStep = step === "review";

  const addonIds = useMemo(() => selectedAddonIds(addonMap), [addonMap]);

  const quotedTotal =
    service && vehicleCategory && vehicleCondition
      ? bookingEstimateTotal({
          packageId: service as PackageId,
          vehicle: vehicleCategory as VehicleCategory,
          addonIds,
          vehicleCondition
        })
      : null;

  const estimateLines =
    service && vehicleCategory && vehicleCondition
      ? buildLocalEstimateLines(service as PackageId, vehicleCategory as VehicleCategory, addonIds, vehicleCondition)
      : [];

  const canNext = () => {
    if (step === "name") return name.trim().length >= 2;
    if (step === "phone") return normalizePhone(phone).length >= 10;
    if (step === "email") {
      const t = email.trim();
      return t.length === 0 || isStrictEmail(normalizeCustomerEmail(t));
    }
    if (step === "address") {
      return (
        streetAddress.trim().length >= 4 &&
        city.trim().length >= 2 &&
        state.trim().length >= 2 &&
        zip.trim().replace(/\D/g, "").length >= 5
      );
    }
    if (step === "car") return car.trim().length >= 2;
    if (step === "vehicle") return vehicleCategory === "sedan" || vehicleCategory === "suv";
    if (step === "condition") return Boolean(vehicleCondition);
    if (step === "service") return Boolean(service);
    if (step === "addons") return true;
    if (step === "schedule") return Boolean(preferredDate) && Boolean(preferredTime);
    if (step === "referral") return true;
    if (step === "review") return confirmed;
    return false;
  };

  const goNext = () => {
    if (!canNext()) return;
    if (step === "review") return;
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  useEffect(() => {
    if (!isReviewStep) setConfirmed(false);
  }, [stepIndex, isReviewStep]);

  const toggleAddon = (id: AddonId) => {
    setAddonMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const submit = async () => {
    const pn = normalizePhone(phone);
    if (pn.length < 10) {
      setErrorMsg("Phone number is required.");
      setStatus("error");
      return;
    }
    const em = normalizeCustomerEmail(email);
    if (em && !isStrictEmail(em)) {
      setErrorMsg("If you enter an email, it must be valid.");
      setStatus("error");
      return;
    }
    if (!confirmed) {
      setErrorMsg("Please confirm your details before sending.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const preferred_date = preferredDate ? preferredDate.toISOString().slice(0, 10) : null;
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: pn,
          email: em || "",
          address: streetAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          car_make_model: car.trim(),
          vehicle_type: vehicleCategory,
          vehicle_condition: vehicleCondition,
          service_package: service,
          addon_ids: addonIds,
          preferred_date,
          preferred_time: preferredTime || null,
          referred_by_phone: null,
          referred_by_code: referredBy.trim().toUpperCase() || null,
          client_fingerprint: clientFingerprint()
        })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; referral_code?: string };
      if (!res.ok) throw new Error(data.error || "Could not submit booking.");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const code = typeof data.referral_code === "string" && data.referral_code.length > 2 ? data.referral_code : "";
      setShareUrl(code ? `${origin}/share/${encodeURIComponent(code)}` : origin);
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const serviceLabel = service ? pkgLabel(service as PackageId) : "—";

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center backdrop-blur-xl"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">You&apos;re booked in our queue</p>
        <h3 className="mt-3 text-2xl font-semibold text-white">Thank you, {name.split(" ")[0]}</h3>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
          We&apos;ll text you shortly to confirm details.
          {normalizeCustomerEmail(email) ? " If you added an email, you&apos;ll get a copy there too." : ""} Share Shine N Time and earn credit toward your next detail.
        </p>
        {shareUrl ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your referral link</p>
            <p className="mt-2 break-all font-mono text-sm text-blue-300">{shareUrl}</p>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(shareUrl)}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:opacity-95"
            >
              Copy link
            </button>
          </div>
        ) : null}
      </motion.div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl md:p-10">
      <div className="mb-8 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-amber-400"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
        Step {stepIndex + 1} of {STEPS.length}
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 min-h-[200px]"
        >
          {step === "name" && (
            <div>
              <label className="block text-sm font-medium text-slate-300">What&apos;s your name?</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-lg text-white outline-none ring-blue-500/40 transition focus:ring-2"
              />
            </div>
          )}
          {step === "phone" && (
            <div>
              <label className="block text-sm font-medium text-slate-300">Mobile number (we&apos;ll text you to confirm)</label>
              <input
                autoFocus
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="7344191846"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-lg text-white outline-none ring-blue-500/40 transition focus:ring-2"
              />
              <p className="mt-2 text-xs text-slate-500">Required — US mobile, 10 digits. This is how we confirm your booking.</p>
            </div>
          )}
          {step === "email" && (
            <div>
              <label className="block text-sm font-medium text-slate-300">Email (optional backup contact)</label>
              <input
                autoFocus
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-lg text-white outline-none ring-blue-500/40 transition focus:ring-2"
              />
              <p className="mt-2 text-xs text-slate-500">Skip if you prefer SMS only — we&apos;ll still send a receipt if you enter one.</p>
            </div>
          )}
          {step === "address" && (
            <div>
              <label className="block text-sm font-medium text-slate-300">Service address for accurate quote</label>
              <div className="mt-3 grid gap-3">
                <input
                  autoFocus
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Street address"
                  className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-base text-white outline-none ring-blue-500/40 transition focus:ring-2"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-base text-white outline-none ring-blue-500/40 transition focus:ring-2"
                  />
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="State (MI)"
                    maxLength={2}
                    className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-base uppercase text-white outline-none ring-blue-500/40 transition focus:ring-2"
                  />
                </div>
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="ZIP code"
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-base text-white outline-none ring-blue-500/40 transition focus:ring-2"
                />
              </div>
            </div>
          )}
          {step === "car" && (
            <div>
              <label className="block text-sm font-medium text-slate-300">Vehicle make & model</label>
              <input
                autoFocus
                value={car}
                onChange={(e) => setCar(e.target.value)}
                placeholder="2022 BMW X5"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-lg text-white outline-none ring-blue-500/40 transition focus:ring-2"
              />
            </div>
          )}
          {step === "vehicle" && (
            <div>
              <p className="text-sm font-medium text-slate-300">What size vehicle?</p>
              <p className="mt-1 text-xs text-slate-500">We price by sedan vs. larger SUVs, trucks & vans.</p>
              <div className="mt-4 grid gap-3">
                {(
                  [
                    {
                      id: "sedan" as const,
                      title: "Sedan / coupe",
                      hint: `Menu starts at $${PACKAGE_PRICING.basic_exterior.sedan} (Basic Exterior)`
                    },
                    {
                      id: "suv" as const,
                      title: "SUV / truck / van",
                      hint: `Menu starts at $${PACKAGE_PRICING.basic_exterior.suv} (Basic Exterior)`
                    }
                  ] as const
                ).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleCategory(v.id)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      vehicleCategory === v.id
                        ? "border-blue-400/60 bg-blue-500/15 text-white"
                        : "border-white/10 bg-black/40 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <span className="block text-sm font-semibold uppercase tracking-widest">{v.title}</span>
                    <span className="mt-1 block text-xs font-normal capitalize tracking-normal text-slate-500">{v.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === "condition" && (
            <div>
              <p className="text-sm font-medium text-slate-300">Current interior condition</p>
              <p className="mt-1 text-xs text-slate-500">Helps us estimate labor time — final scope confirmed on site.</p>
              <div className="mt-4 grid gap-3">
                {(
                  [
                    { id: "light" as const, label: "Light", hint: "Dust + minor crumbs" },
                    { id: "moderate" as const, label: "Moderate", hint: "Stains / visible dirt (+$15 est.)" },
                    { id: "heavy" as const, label: "Heavy", hint: "Pet hair / salt / deep extraction (+$35 est.)" }
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setVehicleCondition(c.id)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      vehicleCondition === c.id
                        ? "border-blue-400/60 bg-blue-500/15 text-white"
                        : "border-white/10 bg-black/40 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <span className="block text-sm font-semibold uppercase tracking-widest">{c.label}</span>
                    <span className="mt-1 block text-xs font-normal capitalize tracking-normal text-slate-500">{c.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === "service" && (
            <div>
              <p className="text-sm font-medium text-slate-300">Which package?</p>
              <div className="mt-4 grid gap-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setService(s.id)}
                    className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest transition ${
                      service === s.id
                        ? "border-blue-400/60 bg-blue-500/15 text-white"
                        : "border-white/10 bg-black/40 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <span className="block">{s.label}</span>
                    {vehicleCategory ? (
                      <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">
                        From ${priceFor(s.id, vehicleCategory)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === "addons" && (
            <div>
              <p className="text-sm font-medium text-slate-300">Add-ons (optional)</p>
              <p className="mt-1 text-xs text-slate-500">Flat menu prices — select anything that applies. Included in your estimate below.</p>
              <div className="mt-4 grid gap-2">
                {BOOKING_ADDONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAddon(a.id)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      addonMap[a.id]
                        ? "border-amber-400/50 bg-amber-500/10 text-white"
                        : "border-white/10 bg-black/40 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <span>{a.label}</span>
                    <span className="tabular-nums text-amber-200/90">+${a.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === "schedule" && (
            <PreferredDateTime
              selected={preferredDate}
              onSelect={setPreferredDate}
              preferredTime={preferredTime}
              onPreferredTime={setPreferredTime}
            />
          )}
          {step === "referral" && (
            <div>
              <label className="block text-sm font-medium text-slate-300">Referral code (optional)</label>
              <p className="mt-1 text-xs text-slate-500">
                Reward unlocks after your friend completes their first paid detail — codes are capped to prevent gaming.
              </p>
              <input
                autoFocus
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value.toUpperCase())}
                placeholder="TAWFIQ10"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 font-mono text-lg uppercase text-white outline-none ring-blue-500/40 transition focus:ring-2"
              />
            </div>
          )}
          {step === "review" && (
            <div>
              <h3 className="text-lg font-semibold text-white">Confirm your request</h3>
              <p className="mt-2 text-sm text-slate-400">Double-check everything before we receive your booking.</p>
              {quotedTotal != null && service ? (
                <aside
                  className="mt-6 rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-500/12 to-black/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md"
                  aria-label="Estimated quote"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/95">Estimated total</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
                    {estimateLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-baseline justify-end gap-3 border-t border-white/10 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-2xl font-bold tabular-nums tracking-tight text-white">
                      <ClipboardCheck className="size-5 text-amber-300" aria-hidden />
                      ${quotedTotal}
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                    Final price confirmed on site after we see the vehicle. Travel or extreme buildup may adjust the total — we&apos;ll tell you before we start.
                  </p>
                </aside>
              ) : null}
              <dl className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Name</dt>
                  <dd className="mt-1 text-slate-200">{name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Phone</dt>
                  <dd className="mt-1 font-mono text-slate-200">{normalizePhone(phone) || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email</dt>
                  <dd className="mt-1 text-slate-200">{email.trim() ? email : "SMS only"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vehicle</dt>
                  <dd className="mt-1 text-slate-200">{car || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Address</dt>
                  <dd className="mt-1 text-slate-200">
                    {streetAddress || "—"}
                    {city ? `, ${city}` : ""}
                    {state ? `, ${state}` : ""}
                    {zip ? ` ${zip}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Size</dt>
                  <dd className="mt-1 text-slate-200">
                    {vehicleCategory === "suv" ? "SUV / truck / van" : vehicleCategory === "sedan" ? "Sedan / coupe" : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Condition</dt>
                  <dd className="mt-1 text-slate-200">{vehicleCondition || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Package</dt>
                  <dd className="mt-1 text-slate-200">{serviceLabel}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Add-ons</dt>
                  <dd className="mt-1 text-slate-200">
                    {addonIds.length ? addonIds.map((id) => BOOKING_ADDONS.find((a) => a.id === id)?.label).join(", ") : "None"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Preferred</dt>
                  <dd className="mt-1 text-slate-200">
                    {preferredDate ? format(preferredDate, "PPP") : "—"}
                    {preferredTime ? ` · ${timeLabels[preferredTime]}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Referral code</dt>
                  <dd className="mt-1 font-mono text-slate-200">{referredBy.trim() ? referredBy.trim().toUpperCase() : "None"}</dd>
                </div>
              </dl>
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 size-4 rounded border-white/20"
                />
                <span>I&apos;ve reviewed my details — send this booking request.</span>
              </label>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {status === "error" ? <p className="mt-4 text-sm text-red-400">{errorMsg}</p> : null}
      <div className="mt-10 flex flex-wrap gap-3">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="rounded-2xl border border-white/15 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/5"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {isReviewStep ? (
          <button
            type="button"
            disabled={!confirmed || status === "loading"}
            onClick={() => void submit()}
            className="ml-auto inline-flex min-h-[48px] min-w-[12rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-lg shadow-blue-500/25 transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                <span className="text-left leading-snug">Sending to Shine N Time System…</span>
              </>
            ) : (
              "Send booking"
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={!canNext() || status === "loading"}
            onClick={goNext}
            className="ml-auto rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-500/25 transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
