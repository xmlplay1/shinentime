import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { normalizeCustomerEmail, isStrictEmail } from "@/lib/email-validation";

/** Count of verified referrals (referee completed first paid job) for a customer. */
export async function GET(req: Request) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const emailParam = searchParams.get("email");
  const phone = normalizePhone(searchParams.get("phone") || "");

  let customerId: string | null = null;

  if (emailParam && isStrictEmail(normalizeCustomerEmail(emailParam))) {
    const em = normalizeCustomerEmail(emailParam);
    const { data: c } = await supabase.from("customers").select("id").eq("email", em).maybeSingle();
    customerId = c?.id ?? null;
  } else if (phone.length >= 10) {
    const { data: c } = await supabase.from("customers").select("id").eq("phone", phone).maybeSingle();
    customerId = c?.id ?? null;
    if (!customerId) {
      const { count, error } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("referred_by_phone", phone);
      if (error) {
        console.error("[referrals] legacy phone count error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ count: count ?? 0, legacy: true });
    }
  } else {
    return NextResponse.json({ error: "Provide ?email= or a valid ?phone=" }, { status: 400 });
  }

  if (!customerId) {
    return NextResponse.json({ count: 0 });
  }

  const { count, error } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_customer_id", customerId)
    .eq("status", "validated");

  if (error) {
    console.error("[referrals] validated count error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
