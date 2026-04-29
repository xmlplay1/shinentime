import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { priceFor, type PackageId, type VehicleCategory } from "@/lib/package-pricing";
import { adminNewQuoteText, quoteReceiptHtml, quoteReceiptText } from "@/lib/email-templates";
import { sendMail } from "@/lib/mailer";
import { normalizeCustomerEmail, isStrictEmail } from "@/lib/email-validation";
import { upsertCustomerRecord } from "@/lib/customers-db";
import { createReferralIfApplicable } from "@/lib/referral-service";

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
  const phoneOrNull = phone.length >= 10 ? phone : null;
  const email = normalizeCustomerEmail(String(b.email || ""));
  const emailConfirm = normalizeCustomerEmail(String(b.email_confirm || ""));
  const car_make_model = String(b.car_make_model || "").trim();
  const service_package = String(b.service_package || "").toLowerCase();
  const vehicle_type_raw = String(b.vehicle_type || "").toLowerCase();
  const vehicle_condition = String(b.vehicle_condition || "").trim().toLowerCase();
  const address = String(b.address || "").trim();
  const city = String(b.city || "").trim();
  const state = String(b.state || "").trim();
  const zip = String(b.zip || "").trim();
  const notes = String(b.notes || "").trim();
  const referred_by_code = String(b.referred_by_code || "")
    .trim()
    .toUpperCase();
  const signup_ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const signup_fingerprint = String(b.client_fingerprint || "").trim() || null;
  const preferred_date_raw = b.preferred_date != null ? String(b.preferred_date).trim() : "";
  const preferred_time_raw = b.preferred_time != null ? String(b.preferred_time).trim().toLowerCase() : "";

  if (name.length < 2) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!isStrictEmail(email) || email !== emailConfirm) {
    return NextResponse.json({ error: "Emails must match and use a valid address." }, { status: 400 });
  }
  if (car_make_model.length < 2) return NextResponse.json({ error: "Vehicle is required." }, { status: 400 });
  if (!["silver", "gold", "platinum"].includes(service_package)) {
    return NextResponse.json({ error: "Invalid service package." }, { status: 400 });
  }

  if (vehicle_type_raw !== "sedan" && vehicle_type_raw !== "suv") {
    return NextResponse.json({ error: "Vehicle size is required (sedan or suv)." }, { status: 400 });
  }
  if (!["light", "moderate", "heavy"].includes(vehicle_condition)) {
    return NextResponse.json({ error: "Vehicle condition is required." }, { status: 400 });
  }
  if (address.length < 5 || city.length < 2 || state.length < 2 || zip.length < 5) {
    return NextResponse.json({ error: "Address, city, state, and zip are required for an accurate quote." }, { status: 400 });
  }
  const vehicle_category: VehicleCategory = vehicle_type_raw;

  const price = priceFor(service_package as PackageId, vehicle_category);

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

  const customer = await upsertCustomerRecord(supabase, email, {
    fullName: name,
    phone: phoneOrNull,
    signupIp: signup_ip,
    signupFingerprint: signup_fingerprint || null
  });
  if (!customer) return NextResponse.json({ error: "Could not save customer profile." }, { status: 500 });

  let insertId: number | null = null;
  const row = {
    name,
    phone: phoneOrNull,
    email,
    customer_id: customer.id,
    car_make_model,
    service_package,
    vehicle_type: vehicle_category,
    vehicle_condition,
    address,
    city,
    state,
    zip,
    notes: notes || null,
    estimated_price: price,
    price,
    preferred_date: preferred_date_raw,
    preferred_time: preferred_time_raw,
    referred_by_phone: null,
    status: "Pending",
    created_at: new Date().toISOString()
  };

  const { data: inserted, error } = await supabase.from("jobs").insert(row).select("id").maybeSingle();

  if (!error && inserted && typeof inserted.id === "number") insertId = inserted.id;

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

  if (insertId != null && referred_by_code.length >= 4) {
    await createReferralIfApplicable(supabase, {
      refereeCustomerId: customer.id,
      refereeJobId: insertId,
      referredByCode: referred_by_code,
      signupIp: signup_ip,
      signupFingerprint: signup_fingerprint || null
    });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    const packageLabel = String(service_package).charAt(0).toUpperCase() + String(service_package).slice(1);
    const vehicleLabel = vehicle_category === "suv" ? "SUV / truck / van" : "Sedan / coupe";
    const prepSummary = "Prep requirements: driveway access, ~50ft hose reach, and keys ready.";

    const emailResults = await Promise.all([
      sendMail({
        to: email,
        subject: "Your Shine N Time Detail is Requested!",
        html: quoteReceiptHtml({
          customerName: name,
          customerEmail: email,
          phone: phoneOrNull || "",
          carMakeModel: car_make_model,
          vehicleType: vehicle_category,
          servicePackage: service_package,
          preferredDate: preferred_date_raw,
          preferredTime: preferred_time_raw,
          estimatedPrice: price
        }),
        text: quoteReceiptText({
          customerName: name,
          customerEmail: email,
          phone: phoneOrNull || "",
          carMakeModel: car_make_model,
          vehicleType: vehicle_category,
          servicePackage: service_package,
          preferredDate: preferred_date_raw,
          preferredTime: preferred_time_raw,
          estimatedPrice: price
        })
      }),
      sendMail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL || "tawfiqalshara424@gmail.com",
        subject: `New quote: ${name} · ${packageLabel} (${vehicleLabel})`,
        html: `<pre style="font-family:Inter,Arial,sans-serif;white-space:pre-wrap">${adminNewQuoteText({
          customerName: name,
          customerEmail: email,
          phone,
          carMakeModel: car_make_model,
          vehicleType: vehicle_category,
          servicePackage: service_package,
          preferredDate: preferred_date_raw,
          preferredTime: preferred_time_raw,
          estimatedPrice: price
        })}\n${prepSummary}</pre>`,
        text: `${adminNewQuoteText({
          customerName: name,
          customerEmail: email,
          phone: phoneOrNull || "",
          carMakeModel: car_make_model,
          vehicleType: vehicle_category,
          servicePackage: service_package,
          preferredDate: preferred_date_raw,
          preferredTime: preferred_time_raw,
          estimatedPrice: price
        })}\n\n${prepSummary}`
      })
    ]);
    if (!emailResults.every(Boolean)) {
      console.warn("[jobs] booking saved but one or more emails failed to send");
      return NextResponse.json({ ok: true, warning: "BOOKING_SAVED_EMAIL_FAILED" });
    }
  }

  return NextResponse.json({
    ok: true,
    referral_code: customer.referral_code
  });
}
