"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  altBefore: string;
  altAfter: string;
  label: string;
};

export function BeforeAfterSlider({ beforeSrc, afterSrc, altBefore, altAfter, label }: Props) {
  const split = useMotionValue(50);
  const clipBefore = useTransform(split, (v) => `inset(0 ${100 - v}% 0 0)`);
  const dividerLeft = useTransform(split, (v) => `${v}%`);

  const [userInteracted, setUserInteracted] = useState(false);
  const autoRef = useRef<ReturnType<typeof animate> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const stopAuto = useCallback(() => {
    autoRef.current?.stop();
    autoRef.current = null;
  }, []);

  useEffect(() => {
    if (userInteracted) {
      stopAuto();
      return;
    }
    // “Breathe” around center (50%): ±20% → 30% … 70% (Framer Motion loop).
    const a = animate(split, [30, 70], {
      duration: 2.4,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut"
    });
    autoRef.current = a;
    return () => {
      a.stop();
      autoRef.current = null;
    };
  }, [userInteracted, split, stopAuto]);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      split.set(p);
    },
    [split]
  );

  const onPointerDownTrack = (e: React.PointerEvent) => {
    setUserInteracted(true);
    stopAuto();
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  const onPointerMoveTrack = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setFromClientX(e.clientX);
  };

  const onPointerUpTrack = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <figure className="w-full">
      <div
        ref={trackRef}
        className="relative aspect-[4/5] w-full max-w-lg touch-pan-y select-none overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl md:max-w-none"
        onPointerDown={onPointerDownTrack}
        onPointerMove={onPointerMoveTrack}
        onPointerUp={onPointerUpTrack}
        onPointerCancel={onPointerUpTrack}
      >
        <img src={afterSrc} alt={altAfter} className="absolute inset-0 h-full w-full object-cover" draggable={false} />

        <motion.div className="absolute inset-0 overflow-hidden" style={{ clipPath: clipBefore }}>
          <img src={beforeSrc} alt={altBefore} className="h-full w-full object-cover" draggable={false} />
        </motion.div>

        <div className="pointer-events-none absolute left-1 top-1 z-20 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-md">
          Before
        </div>
        <div className="pointer-events-none absolute right-1 top-1 z-20 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-md">
          After
        </div>

        <motion.div
          className="pointer-events-none absolute inset-y-0 z-10 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-400 via-white to-amber-400"
          style={{
            left: dividerLeft,
            boxShadow: "0 0 20px rgba(59,130,246,0.5), 0 0 12px rgba(212,175,55,0.35)"
          }}
        />
        <motion.div
          className="pointer-events-none absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/30 bg-black/75 shadow-xl backdrop-blur-md"
          style={{
            left: dividerLeft,
            width: "min(3.5rem, 12vw)",
            height: "min(6rem, 30%)",
            minHeight: "5.25rem",
            boxShadow: "0 0 0 1px rgba(212,175,55,0.3), 0 10px 32px rgba(59,130,246,0.28)"
          }}
        >
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-200">Drag</span>
          <span className="mt-1.5 block h-10 w-1 rounded-full bg-gradient-to-b from-blue-400 to-amber-400" aria-hidden />
        </motion.div>
      </div>
      <figcaption className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </figcaption>
    </figure>
  );
}
