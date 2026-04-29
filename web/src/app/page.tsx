"use client";

import Link from "next/link";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { BeforeAfterGallery } from "@/components/BeforeAfterGallery";
import { BookingForm } from "@/components/BookingForm";
import {
  PackageDetailCallout,
  PrepRequirementsSection,
  ReviewsSection,
  ServiceAreaSection
} from "@/components/LandingInfoSections";
import { ReferralStatus } from "@/components/ReferralStatus";

type PackageCard = {
  id: "silver" | "gold" | "platinum";
  name: string;
  price: string;
  popular?: boolean;
  bullets: readonly string[];
};

const packages: readonly PackageCard[] = [
  {
    id: "silver",
    name: "Silver",
    price: "From $37 sedan · $49 SUV",
    bullets: [
      "Exterior hand wash & rinse",
      "Windows cleaned inside & out",
      "Tire & rim shine",
      "Door jambs wiped down",
      "Light interior dust-down of hard surfaces",
      "Pet hair — light pickup (heavy shedding may need an add-on)"
    ]
  },
  {
    id: "gold",
    name: "Gold",
    price: "From $99 sedan · $115 SUV",
    popular: true,
    bullets: [
      "Everything in Silver",
      "Full interior vacuum (seats, carpets, crevices)",
      "Seat & carpet shampoo / extraction",
      "Odor neutralization treatment",
      "Pet hair removal (moderate)",
      "Salt & sand extraction from carpets & mats",
      "Spot treatment on stains (within reason)"
    ]
  },
  {
    id: "platinum",
    name: "Platinum",
    price: "From $129 sedan · $149 SUV",
    bullets: [
      "Silver + Gold-level interior depth",
      "Steam cleaning on appropriate surfaces",
      "Clay bar treatment (paint decontamination)",
      "Ceramic-style sealant for gloss & UV protection on treated panels",
      "Finishing wipe-down & final inspection walkthrough"
    ]
  }
];

const transformations = [
  {
    before: "/B4CHEV1.webp",
    after: "/AFTCHEV4.webp",
    altBefore: "Before — driver area interior",
    altAfter: "After — driver area interior",
    label: "Chevy Front Cabin Reset"
  },
  {
    before: "/B4CHEV2.webp",
    after: "/AFTCHEV1.webp",
    altBefore: "Before — rear cargo area",
    altAfter: "After — rear cargo area",
    label: "Salt & Sand Extraction"
  },
  {
    before: "/B4PAS2.webp",
    after: "/AFTPAS2.webp",
    altBefore: "Before — dash and console",
    altAfter: "After — dash and console",
    label: "SUV Interior Refresh"
  }
] as const;

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-amber-400/10 bg-black/80 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.85)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-black/55">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 md:px-8">
          <a href="#home" className="group shrink-0">
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-300 bg-clip-text text-sm font-extrabold tracking-[0.22em] text-transparent drop-shadow-[0_0_24px_rgba(212,175,55,0.35)] md:text-base">
              SHINE N TIME
            </span>
          </a>
          <nav className="hidden flex-1 justify-center gap-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:flex xl:gap-8">
            <a href="#gallery" className="transition hover:text-amber-200">
              Gallery
            </a>
            <a href="#packages" className="transition hover:text-amber-200">
              Packages
            </a>
            <a href="#service-area" className="transition hover:text-amber-200">
              Area
            </a>
            <a href="#prep" className="transition hover:text-amber-200">
              Prep
            </a>
            <a href="#reviews" className="transition hover:text-amber-200">
              Reviews
            </a>
            <a href="#book" className="transition hover:text-amber-200">
              Book
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="#reviews"
              className="hidden rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-100 shadow-[0_0_20px_-8px_rgba(212,175,55,0.5)] transition hover:border-amber-400/55 hover:bg-amber-500/20 sm:inline-flex"
            >
              Check our Reviews
            </a>
            <Link
              href="#book"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white transition hover:border-blue-400/40 hover:bg-blue-500/10 md:px-4"
            >
              Quote
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="home" className="relative overflow-x-hidden px-5 pb-24 pt-12 md:px-8 md:pb-32 md:pt-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(59,130,246,0.12),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_60%,rgba(212,175,55,0.06),transparent_50%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-400"
            >
              Canton · Mobile · Concierge
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-white md:text-6xl"
            >
              Canton&apos;s Premium Mobile Detailing.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mx-auto mt-6 max-w-2xl text-base text-slate-400 md:text-lg"
            >
              Professional grade care delivered to your driveway. We bring the shine, you save the time.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-12"
            >
              <a
                href="#book"
                className="inline-flex rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-10 py-4 text-xs font-bold uppercase tracking-[0.25em] text-white shadow-[0_0_40px_-10px_rgba(59,130,246,0.6)] transition hover:shadow-[0_0_50px_-8px_rgba(59,130,246,0.75)]"
              >
                [ Get Instant Quote ]
              </a>
            </motion.div>
          </div>
        </section>

        <ServiceAreaSection />

        {/* Before & After gallery */}
        <section id="gallery" className="border-t border-white/5 bg-gradient-to-b from-black to-zinc-950 px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Before & After</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-2xl font-semibold text-white md:text-3xl">
              Interactive transformations — drag or watch the reveal.
            </p>
            <BeforeAfterGallery items={transformations} />
          </div>
        </section>

        {/* Packages */}
        <section id="packages" className="border-t border-white/5 px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Packages</h2>
            <p className="mt-3 text-center text-2xl font-semibold text-white md:text-3xl">Simple tiers. Serious results.</p>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {packages.map((pkg, i) => (
                <motion.article
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-xl backdrop-blur-xl ${
                    pkg.popular ? "ring-1 ring-amber-400/30 md:scale-[1.02]" : ""
                  }`}
                >
                  {pkg.popular ? (
                    <span className="absolute right-4 top-4 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-200">
                      Most Popular
                    </span>
                  ) : null}
                  <h3 className="text-lg font-semibold tracking-wide text-white">{pkg.name}</h3>
                  <p className="mt-2 text-sm font-medium text-amber-200/90">{pkg.price}</p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-400">
                    {pkg.bullets.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span className="mt-0.5 text-amber-500">✓</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              ))}
            </div>
            <PackageDetailCallout />
          </div>
        </section>

        <PrepRequirementsSection />

        <ReviewsSection />

        {/* Booking */}
        <section id="book" className="border-t border-white/5 bg-black px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-lg">
            <h2 className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Book</h2>
            <p className="mt-3 text-center text-2xl font-semibold text-white">One question at a time.</p>
            <div className="mt-12">
              <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-white/5" aria-hidden />}>
                <BookingForm />
              </Suspense>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-zinc-950 px-5 py-14 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Shine N Time</p>
            <p className="mt-2 text-sm text-slate-400">Canton&apos;s premium mobile detailing.</p>
            <p className="mt-4 text-xs text-slate-600">© {new Date().getFullYear()} Shine N Time</p>
          </div>
          <ReferralStatus />
        </div>
      </footer>
    </div>
  );
}
