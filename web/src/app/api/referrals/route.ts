import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";

export async function GET(req: Request) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const phone = normalizePhone(searchParams.get("phone") || "");
  if (phone.length < 10) {
    return NextResponse.json({ error: "Valid phone required." }, { status: 400 });
  }

  const { count, error } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("referred_by_phone", phone);

  if (error) {
    console.error("[referrals] count error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
