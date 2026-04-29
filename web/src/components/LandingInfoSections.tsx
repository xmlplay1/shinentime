"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Droplets,
  Gauge,
  Home,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wrench,
  Zap
} from "lucide-react";

const coreCities = ["Canton", "Plymouth", "Westland", "Livonia", "Northville", "Novi"] as const;
const extendedCities = ["Ann Arbor", "Ypsilanti", "Belleville", "Van Buren Twp.", "Romulus", "Taylor"] as const;

const reviews = [
  { quote: "They got stains out I thought were permanent. Communication was clear from quote to finish.", author: "Jordan L." },
  { quote: "Quick response, fair price, and they showed up on time. I would book again.", author: "Chris J." },
  { quote: "Got rid of old odor in my car and left everything looking fresh.", author: "Alonzo R." },
  { quote: "These guys actually care. They explained everything before starting.", author: "Kayla M." },
  { quote: "Interior detail was worth it. Good work and good communication.", author: "Evan P." },
  { quote: "Booked through DM and the whole process was simple.", author: "Sara N." }
] as const;

export function ServiceAreaSection() {
  return (
    <section id="service-area" className="border-t border-white/5 bg-gradient-to-b from-zinc-950 to-black px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400/90">Service area</h2>
            <p className="mt-3 max-w-2xl text-2xl font-semibold text-white md:text-3xl">Mobile detailing across Canton &amp; neighbors.</p>
            <p className="mt-4 max-w-2xl text-sm text-slate-400">
              We&apos;re based around Canton, Michigan. Not sure if you&apos;re in range? Drop your zip in the booking form — we&apos;ll confirm before you pay
              anything.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            <Truck className="size-4 shrink-0 text-amber-300" aria-hidden />
            <span>
              <strong className="font-semibold text-white">Mobile / travel:</strong> farther jobs may include a small travel fee — we quote it upfront.
            </span>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 text-amber-200">
              <MapPin className="size-5" aria-hidden />
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">Core coverage</h3>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-2 text-sm text-slate-300 sm:grid-cols-3">
              {coreCities.map((c) => (
                <li key={c} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
                  <Sparkles className="size-3.5 shrink-0 text-amber-400/80" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 text-slate-300">
              <Gauge className="size-5 text-amber-400/90" aria-hidden />
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">Often available</h3>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-2 text-sm text-slate-300 sm:grid-cols-3">
              {extendedCities.map((c) => (
                <li key={c} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
                  <span className="text-amber-400/70">·</span>
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">Schedule and travel fees depend on distance from Canton — we&apos;ll confirm when you book.</p>
          </motion.article>
        </div>
      </div>
    </section>
  );
}

export function PrepRequirementsSection() {
  return (
    <section id="prep" className="border-t border-white/5 px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400/90">Prep requirements</h2>
        <p className="mt-3 max-w-2xl text-2xl font-semibold text-white md:text-3xl">So we can do our best work at your driveway.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Home,
              title: "Driveway access",
              body: (
                <>
                  We need a safe place to work with room around the vehicle. Garage is OK if there&apos;s space and ventilation.
                </>
              )
            },
            {
              icon: Droplets,
              title: "Water — ~50 ft hose reach",
              body: (
                <>
                  Access to an outdoor spigot within about 50 feet helps us rinse and extract without running through your house.
                </>
              )
            },
            {
              icon: Zap,
              title: "Power when possible",
              body: (
                <>
                  An exterior outlet (or garage) for extractors and tools keeps quality consistent. Tell us in the notes if power is limited.
                </>
              )
            }
          ].map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
            >
              <item.icon className="size-8 text-amber-400" strokeWidth={1.5} aria-hidden />
              <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
            </motion.article>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/[0.07] p-5 text-sm text-amber-100/95">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden />
          <p>
            <strong className="text-white">Heads up:</strong> remove loose items and pets from the vehicle when possible. Bad weather can push appointments —
            we&apos;ll text you if we need to reschedule for safety or results.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ReviewsSection() {
  return (
    <section id="reviews" className="border-t border-white/5 bg-gradient-to-b from-black to-zinc-950 px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400/90">Reviews</h2>
            <p className="mt-3 text-2xl font-semibold text-white md:text-3xl">What neighbors are saying.</p>
          </div>
          <p className="max-w-sm text-sm text-slate-500">Real feedback from Canton-area customers — we show up, explain the plan, and deliver.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <motion.article
              key={r.author}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
            >
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="size-3.5 fill-amber-400/90 text-amber-400/90" aria-hidden />
                ))}
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-300">&ldquo;{r.quote}&rdquo;</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-500">{r.author}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PackageDetailCallout() {
  return (
    <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md md:p-8">
      <div className="flex flex-wrap items-center gap-3 text-amber-200">
        <Wrench className="size-5" aria-hidden />
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">How we scope your job</h3>
      </div>
      <ul className="mt-4 space-y-3 text-sm text-slate-400">
        <li className="flex gap-2">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-400/90" aria-hidden />
          <span>
            Your online quote is an <strong className="text-slate-200">estimate</strong> from package + vehicle size. We confirm final scope on site before you
            pay.
          </span>
        </li>
        <li className="flex gap-2">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-400/90" aria-hidden />
          <span>
            <strong className="text-slate-200">Heavy pet hair, sand, or stains</strong> may need add-ons — we&apos;ll tell you before we start.
          </span>
        </li>
        <li className="flex gap-2">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-400/90" aria-hidden />
          <span>
            <strong className="text-slate-200">Platinum</strong> adds steam, clay bar, and a ceramic-style sealant for gloss and UV protection on treated surfaces.
          </span>
        </li>
      </ul>
    </div>
  );
}
