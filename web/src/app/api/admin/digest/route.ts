import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDailyDigestEmail } from "@/lib/team-quote-alerts";
import { calculateQuoteScore, hoursSince, slaBadge } from "@/lib/admin-insights";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== process.env.ADMIN_DIGEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 });
  }

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: jobs }, { data: logs }] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    supabase.from("job_communication_logs").select("job_id,created_at").order("created_at", { ascending: false })
  ]);

  const jobRows = (jobs || []) as Record<string, unknown>[];
  const logRows = (logs || []) as { job_id: number; created_at: string }[];
  const touched = new Set(logRows.map((l) => l.job_id));

  const newLeads24h = jobRows.filter((j) => String(j.created_at || "") >= since24h).length;
  const completed24h = jobRows.filter(
    (j) => String(j.status || "").toLowerCase() === "completed" && String(j.created_at || "") >= since24h
  ).length;
  const pendingFollowups = jobRows.filter((j) => {
    const status = String(j.status || "").toLowerCase();
    return (status === "pending" || status === "confirmed") && !touched.has(Number(j.id || 0));
  }).length;

  const topScored = [...jobRows]
    .sort((a, b) => calculateQuoteScore(b) - calculateQuoteScore(a))
    .slice(0, 5)
    .map((j) => ({
      id: Number(j.id || 0),
      name: String(j.name || "Customer"),
      score: calculateQuoteScore(j),
      urgency: slaBadge(hoursSince(String(j.created_at || ""))).label
    }));

  const sent = await sendDailyDigestEmail({
    dateIso: now.toISOString(),
    newLeads24h,
    completed24h,
    pendingFollowups,
    topScored
  });

  if (!sent) {
    return NextResponse.json({ ok: false, error: "Digest email failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
