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

  if (name.length < 2) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (phone.length < 10) return NextResponse.json({ error: "Valid phone is required." }, { status: 400 });
  if (car_make_model.length < 2) return NextResponse.json({ error: "Vehicle is required." }, { status: 400 });
  if (!["silver", "gold", "platinum"].includes(service_package)) {
    return NextResponse.json({ error: "Invalid service package." }, { status: 400 });
  }

  const row = {
    name,
    phone,
    car_make_model,
    service_package,
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
          "Could not save booking. Ensure a `jobs` table exists with columns: name, phone, car_make_model, service_package, referred_by_phone (nullable), created_at."
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
