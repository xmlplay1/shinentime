"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { formatSharePath, normalizePhone } from "@/lib/phone";
import { PreferredDateTime, type PreferredTime } from "@/components/PreferredDateTime";

const STEPS = ["name", "phone", "car", "service", "schedule", "referral", "review"] as const;

const services = [
  { id: "silver", label: "Silver", price: "From $39" },
  { id: "gold", label: "Gold", price: "From $99" },
  { id: "platinum", label: "Platinum", price: "From $129" }
] as const;

const timeLabels: Record<PreferredTime, string> = {
  morning: "Morning (8am – 12pm)",
  afternoon: "Afternoon (12pm – 4pm)",
  evening: "Evening (4pm – 8pm)"
};

export function BookingForm() {
  const searchParams = useSearchParams();
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [car, setCar] = useState("");
  const [service, setService] = useState<(typeof services)[number]["id"] | "">("");
  const [preferredDate, setPreferredDate] = useState<Date | undefined>(undefined);
  const [preferredTime, setPreferredTime] = useState<PreferredTime | "">("");
  const [referredBy, setReferredBy] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferredBy((prev) => prev || ref);
  }, [searchParams]);

  const step = STEPS[stepIndex];
  const progress = useMemo(() => ((stepIndex + 1) / STEPS.length) * 100, [stepIndex]);
  const isReviewStep = step === "review";

  const canNext = () => {
    if (step === "name") return name.trim().length >= 2;
    if (step === "phone") return normalizePhone(phone).length >= 10;
    if (step === "car") return car.trim().length >= 2;
    if (step === "service") return Boolean(service);
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

  const submit = async () => {
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
          phone: normalizePhone(phone),
          car_make_model: car.trim(),
          service_package: service,
          preferred_date,
          preferred_time: preferredTime || null,
          referred_by_phone: referredBy.trim() ? normalizePhone(referredBy) : null
        })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not submit booking.");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const path = formatSharePath(phone);
      setShareUrl(path ? `${origin}${path}` : origin);
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const serviceMeta = services.find((s) => s.id === service);
  const serviceLabel = serviceMeta?.label ?? "—";
  const servicePrice = serviceMeta?.price ?? "";

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
          We&apos;ll text you shortly to confirm details. Share Shine N Time and earn credit toward your next detail.
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
    <div id="book" className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl md:p-10">
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
              <label className="block text-sm font-medium text-slate-300">Best number to reach you</label>
              <input
                autoFocus
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="7344191846"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-lg text-white outline-none ring-blue-500/40 transition focus:ring-2"
              />
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
                    {s.label}
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
              <label className="block text-sm font-medium text-slate-300">Were you referred by a friend?</label>
              <p className="mt-1 text-xs text-slate-500">Optional — enter their phone number.</p>
              <input
                autoFocus
                type="tel"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
                placeholder="Friend's phone"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-lg text-white outline-none ring-blue-500/40 transition focus:ring-2"
              />
            </div>
          )}
          {step === "review" && (
            <div>
              <h3 className="text-lg font-semibold text-white">Confirm your request</h3>
              <p className="mt-2 text-sm text-slate-400">Double-check everything before we receive your booking.</p>
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
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vehicle</dt>
                  <dd className="mt-1 text-slate-200">{car || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Package</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-2 text-slate-200">
                    <span>{serviceLabel}</span>
                    {servicePrice ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-100">
                        <ClipboardCheck className="size-3.5 text-amber-300" aria-hidden />
                        {servicePrice}
                      </span>
                    ) : null}
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
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Referral</dt>
                  <dd className="mt-1 font-mono text-slate-200">
                    {referredBy.trim() ? normalizePhone(referredBy) : "None"}
                  </dd>
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
