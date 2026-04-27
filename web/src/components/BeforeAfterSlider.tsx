"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  altBefore: string;
  altAfter: string;
};

export function BeforeAfterSlider({ beforeSrc, afterSrc, altBefore, altAfter }: Props) {
  const [pct, setPct] = useState(50);
  const dragging = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPct(p);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setFromClientX(e.clientX);
  };

  const endDrag = (e: React.PointerEvent) => {
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      ref={trackRef}
      className="relative aspect-[4/3] w-full max-w-xl cursor-ew-resize overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <img src={afterSrc} alt={altAfter} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
        <img src={beforeSrc} alt={altBefore} className="h-full w-full object-cover" draggable={false} />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_16px_rgba(59,130,246,0.75)]"
        style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
      />
      <div
        className="pointer-events-none absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/75 text-[10px] font-bold tracking-widest text-white backdrop-blur-md"
        style={{ left: `${pct}%` }}
      >
        DRAG
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur">
        Before
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur">
        After
      </div>
    </div>
  );
}
