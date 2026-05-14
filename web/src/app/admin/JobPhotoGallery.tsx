"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  items: { name: string; url: string }[];
};

export function JobPhotoGallery({ items }: Props) {
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenUrl(null);
    },
    []
  );

  useEffect(() => {
    if (!openUrl) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openUrl, onKey]);

  if (!items.length) {
    return <p className="mt-2 text-[10px] text-slate-600">No photos yet — upload above.</p>;
  }

  return (
    <div className="mt-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">Photos</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((img) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setOpenUrl(img.url)}
            className="relative size-14 overflow-hidden rounded-md border border-white/15 bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400/70"
            aria-label={`Open photo ${img.name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="size-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      {openUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          aria-label="Close photo viewer"
          onClick={() => setOpenUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={openUrl}
            alt="Full size"
            className="max-h-[90vh] max-w-[min(96vw,900px)] rounded-lg border border-white/15 object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}
    </div>
  );
}
