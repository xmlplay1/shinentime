export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-6 w-44 animate-pulse rounded bg-white/10" />
          <div className="mt-6 grid gap-2">
            <div className="h-9 animate-pulse rounded bg-white/10" />
            <div className="h-9 animate-pulse rounded bg-white/10" />
            <div className="h-9 animate-pulse rounded bg-white/10" />
          </div>
        </aside>
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-28 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-28 animate-pulse rounded-2xl bg-white/10" />
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-96 animate-pulse rounded-2xl bg-white/10" />
        </section>
      </div>
    </main>
  );
}
