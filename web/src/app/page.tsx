"use client";

import Link from "next/link";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { BeforeAfterGallery } from "@/components/BeforeAfterGallery";
import { BookingForm } from "@/components/BookingForm";
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
    price: "From $37",
    bullets: ["Hand wash", "Windows", "Tires shined", "Door jambs"]
  },
  {
    id: "gold",
    name: "Gold",
    price: "From $99",
    popular: true,
    bullets: ["Everything in Silver", "Full vacuum", "Shampoo seats & carpets", "Odor treatment"]
  },
  {
    id: "platinum",
    name: "Platinum",
    price: "From $129",
    bullets: ["Silver + Gold depth", "Steam cleaning", "Clay bar", "Ceramic sealant"]
  }
];

const GALLERY_V = "3";

const transformations = [
  {
    before: `/B4CHEV1.webp?v=${GALLERY_V}`,
    after: `/AFTCHEV4.webp?v=${GALLERY_V}`,
    altBefore: "Before — driver area interior",
    altAfter: "After — driver area interior",
    label: "Driver Side Deep Clean"
  },
  {
    before: `/B4CHEV2.webp?v=${GALLERY_V}`,
    after: `/AFTCHEV1.webp?v=${GALLERY_V}`,
    altBefore: "Before — rear cargo area",
    altAfter: "After — rear cargo area",
    label: "Rear Floor Extraction"
  },
  {
    before: `/B4PAS2.webp?v=${GALLERY_V}`,
    after: `/AFTPAS2.webp?v=${GALLERY_V}`,
    altBefore: "Before — dash and console",
    altAfter: "After — dash and console",
    label: "Full Interior Reset"
  }
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <span className="text-sm font-semibold tracking-[0.2em] text-slate-300">SHINE N TIME</span>
          <nav className="hidden gap-8 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 md:flex">
            <a href="#gallery" className="transition hover:text-white">
              Gallery
            </a>
            <a href="#packages" className="transition hover:text-white">
              Packages
            </a>
            <a href="#book" className="transition hover:text-white">
              Book
            </a>
          </nav>
          <Link
            href="#book"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition hover:border-blue-400/40 hover:bg-blue-500/10"
          >
            Quote
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-5 pb-24 pt-32 md:px-8 md:pb-32 md:pt-40">
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
                  <p className="mt-2 text-sm text-blue-300">{pkg.price}</p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-400">
                    {pkg.bullets.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span className="text-blue-500">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

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
