import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  reminderWindowAnchorsUtc,
  sendCustomerBookingUpdateEmails
} from "@/lib/customer-notifications";

/** POST with Authorization: Bearer $ADMIN_DIGEST_TOKEN — processes 24h and 2h reminders for Confirmed jobs */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== process.env.ADMIN_DIGEST_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 });

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id,name,email,phone,status,preferred_date,preferred_time,customer_portal_token,reminder_sent_24h_at,reminder_sent_2h_at"
    );
  if (error) {
    console.error("[reminders]", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const rows = jobs || [];
  const nowMs = Date.now();
  let sent24 = 0;
  let sent2 = 0;
  let skipped = 0;

  for (const row of rows) {
    const status = String(row.status || "").toLowerCase();
    if (status !== "confirmed") {
      if (status === "completed" || status === "cancelled" || status === "archived") skipped++;
      continue;
    }

    const window = reminderWindowAnchorsUtc({
      preferred_date: row.preferred_date as string | null,
      preferred_time: row.preferred_time as string | null
    });
    if (!window) continue;

    const startMs = window.startUtc.getTime();
    const endMs = window.endUtc.getTime();
    const id = Number(row.id);

    const need24 = nowMs >= startMs - 24 * 60 * 60 * 1000 && nowMs < startMs;
    const notSent24 = !(row.reminder_sent_24h_at as string | null);
    if (need24 && notSent24) {
      const { emailOk, smsOk } = await sendCustomerBookingUpdateEmails({
        kind: "reminder_24h",
        row: {
          name: row.name as string | null,
          email: row.email as string | null,
          phone: row.phone as string | null,
          car_make_model: null,
          service_package: null,
          preferred_date: row.preferred_date as string | null,
          preferred_time: row.preferred_time as string | null,
          customer_portal_token: row.customer_portal_token as string | null
        }
      });
      if (emailOk || smsOk) {
        await supabase.from("jobs").update({ reminder_sent_24h_at: new Date().toISOString() }).eq("id", id);
        sent24++;
      }
    }

    const need2 = nowMs >= startMs - 2 * 60 * 60 * 1000 && nowMs < endMs + 60 * 60 * 1000;
    const notSent2 = !(row.reminder_sent_2h_at as string | null);
    if (need2 && notSent2) {
      const { emailOk, smsOk } = await sendCustomerBookingUpdateEmails({
        kind: "reminder_2h",
        row: {
          name: row.name as string | null,
          email: row.email as string | null,
          phone: row.phone as string | null,
          car_make_model: null,
          service_package: null,
          preferred_date: row.preferred_date as string | null,
          preferred_time: row.preferred_time as string | null,
          customer_portal_token: row.customer_portal_token as string | null
        }
      });
      if (emailOk || smsOk) {
        await supabase.from("jobs").update({ reminder_sent_2h_at: new Date().toISOString() }).eq("id", id);
        sent2++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent_24h: sent24,
    sent_2h: sent2,
    skipped_terminal: skipped,
    checked: rows.length
  });
}
