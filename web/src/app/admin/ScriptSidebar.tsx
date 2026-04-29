"use client";

import { useMemo, useState } from "react";
import { Copy, MessageSquareText } from "lucide-react";

type ScriptTemplate = {
  id: string;
  title: string;
  body: string;
};

const TEMPLATES: ScriptTemplate[] = [
  {
    id: "quote-confirmation",
    title: "Quote Confirmation",
    body: "Hi [Customer Name], this is Shine N Time. Your [Package] request is confirmed. We look forward to making your vehicle shine."
  },
  {
    id: "hose-reminder",
    title: "Hose / Water Reminder",
    body: "Hi [Customer Name], quick reminder for your [Package] detail: please ensure water access within 50ft and driveway space is available."
  },
  {
    id: "arrival-notice",
    title: "Arrival Notification",
    body: "Hi [Customer Name], we are on the way for your [Package] appointment and should arrive shortly."
  },
  {
    id: "review-request",
    title: "Review Request",
    body: "Hi [Customer Name], thank you for choosing Shine N Time for your [Package]. We would really appreciate your review: [Review Link]"
  }
];

type Props = {
  customerName?: string | null;
  packageName?: string | null;
  reviewLink: string;
};

export function ScriptSidebar({ customerName, packageName, reviewLink }: Props) {
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const resolved = useMemo(() => {
    const name = (customerName || "Customer").trim();
    const pkg = (packageName || "detail package").trim();
    return TEMPLATES.map((item) => ({
      ...item,
      text: item.body
        .replaceAll("[Customer Name]", name)
        .replaceAll("[Package]", pkg)
        .replaceAll("[Review Link]", reviewLink)
    }));
  }, [customerName, packageName, reviewLink]);

  async function copyScript(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      // no-op; copy can fail if browser blocks clipboard without gesture
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-blue-400/50 bg-blue-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100 shadow-lg backdrop-blur-md md:bottom-6"
      >
        <MessageSquareText className="size-4" />
        Scripts
      </button>

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[22rem] max-w-[90vw] border-l border-white/10 bg-black/90 p-4 shadow-2xl backdrop-blur-xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">Outreach Scripts</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-300"
          >
            Close
          </button>
        </div>
        <div className="grid gap-3">
          {resolved.map((item) => (
            <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">{item.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{item.text}</p>
              <button
                type="button"
                onClick={() => copyScript(item.id, item.text)}
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-200"
              >
                <Copy className="size-3.5" />
                {copiedId === item.id ? "Copied" : "Copy"}
              </button>
            </article>
          ))}
        </div>
      </aside>
    </>
  );
}
