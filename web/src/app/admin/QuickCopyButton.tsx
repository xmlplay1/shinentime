"use client";

import { useState } from "react";

type Props = {
  readonly text: string;
};

export function QuickCopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          setCopied(false);
        }
      }}
      className="rounded-md border border-blue-400/35 bg-blue-500/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-200 hover:bg-blue-500/20"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
