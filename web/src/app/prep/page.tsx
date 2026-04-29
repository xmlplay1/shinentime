import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Droplets, KeyRound, MapPinHouse, ShieldCheck, CarFront } from "lucide-react";

export const metadata: Metadata = {
  title: "Prep & Service Area | Shine N Time",
  description: "Prep checklist, coverage area, and package detail checklists for Shine N Time mobile detailing."
};

const serviceAreaCore = ["Canton", "Plymouth", "Northville", "Westland", "Livonia", "Novi"] as const;

const silverChecklist = [
  "Exterior hand wash and rinse",
  "Windows cleaned (inside + out)",
  "Tire and rim shine",
  "Door jamb wipe-down",
  "Light interior dust-down"
] as const;

const goldChecklist = [
  "Everything in Silver",
  "Full interior vacuum (seats/carpets/crevices)",
  "Seat and carpet shampoo / extraction",
  "Odor neutralization treatment",
  "Pet hair removal",
  "Salt and sand extraction"
] as const;

export default function PrepPage() {
  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white md:px-8 md:py-14">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">Shine N Time</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Prep & Service Info</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Quick reference for coverage, what each package includes, and what we need at your appointment location.
          </p>
          <Link
            href="/#book"
            className="mt-6 inline-flex rounded-full border border-amber-400/35 bg-amber-500/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-500/20"
          >
            Book a quote
          </Link>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-amber-200">
              <MapPinHouse className="size-5" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Service Area</h2>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-300">
              {serviceAreaCore.map((city) => (
                <li key={city} className="rounded-lg border border-white/8 bg-black/35 px-3 py-2">
                  {city}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Farther cities may include a small mobile/travel fee. We always confirm before the appointment.
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-amber-200">
              <ShieldCheck className="size-5" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Prep Requirements</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <Droplets className="mt-0.5 size-4 shrink-0 text-amber-300" />
                Water access / hose reach around 50ft.
              </li>
              <li className="flex items-start gap-2">
                <CarFront className="mt-0.5 size-4 shrink-0 text-amber-300" />
                Driveway access and safe room to work around the car.
              </li>
              <li className="flex items-start gap-2">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-amber-300" />
                Keys ready and loose items removed where possible.
              </li>
            </ul>
          </article>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Silver Package Checklist</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {silverChecklist.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-amber-400/20 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Gold Package Checklist</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {goldChecklist.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-amber-300" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
