import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: Request) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server is missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = String(b.name || "").trim();
  const phone = normalizePhone(String(b.phone || ""));
  const car_make_model = String(b.car_make_model || "").trim();
  const service_package = String(b.service_package || "").toLowerCase();
  const referred_by_phone = b.referred_by_phone ? normalizePhone(String(b.referred_by_phone)) : null;
  const preferred_date_raw = b.preferred_date != null ? String(b.preferred_date).trim() : "";
  const preferred_time_raw = b.preferred_time != null ? String(b.preferred_time).trim().toLowerCase() : "";

  if (name.length < 2) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (phone.length < 10) return NextResponse.json({ error: "Valid phone is required." }, { status: 400 });
  if (car_make_model.length < 2) return NextResponse.json({ error: "Vehicle is required." }, { status: 400 });
  if (!["silver", "gold", "platinum"].includes(service_package)) {
    return NextResponse.json({ error: "Invalid service package." }, { status: 400 });
  }

  if (!preferred_date_raw) {
    return NextResponse.json({ error: "Preferred date is required." }, { status: 400 });
  }
  const preferredDateObj = new Date(`${preferred_date_raw}T12:00:00`);
  if (Number.isNaN(preferredDateObj.getTime())) {
    return NextResponse.json({ error: "Invalid preferred date." }, { status: 400 });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preferredDateObj < today) {
    return NextResponse.json({ error: "Preferred date cannot be in the past." }, { status: 400 });
  }
  if (preferredDateObj.getDay() === 0) {
    return NextResponse.json({ error: "Sundays are not available." }, { status: 400 });
  }

  if (!["morning", "afternoon", "evening"].includes(preferred_time_raw)) {
    return NextResponse.json({ error: "Preferred time is required." }, { status: 400 });
  }

  const row = {
    name,
    phone,
    car_make_model,
    service_package,
    preferred_date: preferred_date_raw,
    preferred_time: preferred_time_raw,
    referred_by_phone: referred_by_phone && referred_by_phone.length >= 10 ? referred_by_phone : null,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from("jobs").insert(row);

  if (error) {
    console.error("[jobs] insert error", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Could not save booking. Ensure a `jobs` table exists with columns: name, phone, car_make_model, service_package, preferred_date, preferred_time, referred_by_phone (nullable), created_at."
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
