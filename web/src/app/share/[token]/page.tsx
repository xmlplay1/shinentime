import Link from "next/link";
import { normalizePhone } from "@/lib/phone";

type Props = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: Props) {
  const { token: raw } = await params;
  const decoded = decodeURIComponent(raw || "").trim();
  const digits = normalizePhone(decoded);
  const looksLikePhone = digits.length >= 10 && !/[a-z]/i.test(decoded);
  const refQuery = looksLikePhone ? digits : decoded.toUpperCase();

  return (
    <main className="min-h-screen bg-black px-6 py-24 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-400">Shine N Time</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">You&apos;re invited</h1>
      <p className="mx-auto mt-4 max-w-md text-sm text-slate-400">
        Book premium mobile detailing in Canton. Your referrer earns credit once you complete your first paid detail — abuse checks apply.
      </p>
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          href={`/?ref=${encodeURIComponent(refQuery)}#book`}
          className="inline-flex rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-500/30"
        >
          Get instant quote
        </Link>
        <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline">
          Learn more
        </Link>
      </div>
    </main>
  );
}
