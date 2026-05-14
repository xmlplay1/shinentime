import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { isStrictEmail, normalizeCustomerEmail } from "@/lib/email-validation";
import { createResendClient, getResendFrom } from "@/lib/resend";
import { sendMail } from "@/lib/mailer";
import { adminNewQuoteText, prettifyPackage, quoteReceiptHtml, quoteReceiptText } from "@/lib/email-templates";
import {
  BOOKING_ADDONS,
  bookingEstimateTotal,
  conditionLaborAdjustment,
  isAddonId,
  isCurrentPackageId,
  priceFor,
  type PackageId,
  type VehicleCategory
} from "@/lib/package-pricing";

function normalizeEmail(value: string | null | undefined): string | null {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : null;
}

function buildEstimateLines(
  pkg: PackageId,
  vt: VehicleCategory,
  addonIds: readonly string[],
  vehicleCondition: string
): string[] {
  const lines: string[] = [`${prettifyPackage(pkg)} (package): $${priceFor(pkg, vt)}`];
  for (const id of addonIds) {
    const row = BOOKING_ADDONS.find((a) => a.id === id);
    if (row) lines.push(`${row.label}: +$${row.price}`);
  }
  const adj = conditionLaborAdjustment(vehicleCondition);
  if (adj > 0) lines.push(`Soil level (${vehicleCondition}): +$${adj}`);
  return lines;
}

async function resolveAdminRecipients(): Promise<string[]> {
  const out = new Set<string>();
  String(process.env.ADMIN_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((v) => normalizeEmail(v))
    .filter((v): v is string => Boolean(v))
    .forEach((v) => out.add(v));

  const supabase = createAdminClient();
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("email, role")
      .in("role", ["ADMIN", "SERVICE_REP"]);
    for (const row of data || []) {
      const email = normalizeEmail((row as { email?: string | null }).email || null);
      if (email) out.add(email);
    }
  }
  return [...out];
}

async function sendAdminQuoteAlert(input: {
  recipients: string[];
  subject: string;
  text: string;
}): Promise<boolean> {
  if (!input.recipients.length) return false;

  try {
    const resend = createResendClient();
    if (resend) {
      const { error } = await resend.emails.send({
        from: getResendFrom(),
        to: input.recipients,
        subject: input.subject,
        text: input.text,
        html: `<pre style="font-family:Inter,Arial,sans-serif;white-space:pre-wrap">${input.text}</pre>`
      });
      if (!error) return true;
      console.error("[jobs] resend admin alert failed", error);
    }
  } catch (error) {
    console.error("[jobs] resend admin alert exception", error);
  }

  let atLeastOneDelivered = false;
  for (const recipient of input.recipients) {
    const ok = await sendMail({
      to: recipient,
      subject: input.subject,
      text: input.text
    });
    atLeastOneDelivered = atLeastOneDelivered || ok;
  }
  return atLeastOneDelivered;
}

async function sendCustomerQuoteReceipt(input: {
  customerName: string;
  customerEmail: string | null;
  phone: string;
  carMakeModel: string;
  vehicleType: VehicleCategory;
  servicePackage: PackageId;
  preferredDate: string;
  preferredTime: "morning" | "afternoon" | "evening";
  estimatedPrice: number;
  estimateLines: readonly string[];
}): Promise<boolean> {
  const em = input.customerEmail?.trim() ?? "";
  if (!em || !isStrictEmail(normalizeCustomerEmail(em))) {
    return true;
  }
  const customerEmail = normalizeCustomerEmail(em);

  const subject = `Shine N Time Quote Received • ${input.customerName}`;
  const html = quoteReceiptHtml({
    customerName: input.customerName,
    customerEmail,
    phone: input.phone,
    carMakeModel: input.carMakeModel,
    vehicleType: input.vehicleType,
    servicePackage: input.servicePackage,
    preferredDate: input.preferredDate,
    preferredTime: input.preferredTime,
    estimatedPrice: input.estimatedPrice,
    estimateLines: input.estimateLines
  });
  const text = quoteReceiptText({
    customerName: input.customerName,
    customerEmail,
    phone: input.phone,
    carMakeModel: input.carMakeModel,
    vehicleType: input.vehicleType,
    servicePackage: input.servicePackage,
    preferredDate: input.preferredDate,
    preferredTime: input.preferredTime,
    estimatedPrice: input.estimatedPrice,
    estimateLines: input.estimateLines
  });

  try {
    const resend = createResendClient();
    if (resend) {
      const { error } = await resend.emails.send({
        from: getResendFrom(),
        to: [customerEmail],
        subject,
        html,
        text
      });
      if (!error) return true;
      console.error("[jobs] resend receipt failed", error);
    }
  } catch (error) {
    console.error("[jobs] resend receipt exception", error);
  }

  return sendMail({
    to: customerEmail,
    subject,
    text,
    html
  });
}

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
  const emailRaw = normalizeCustomerEmail(String(b.email || ""));
  const emailOpt = emailRaw.length > 0 ? emailRaw : null;
  const car_make_model = String(b.car_make_model || "").trim();
  const service_package = String(b.service_package || "").toLowerCase();
  const vehicle_type_raw = String(b.vehicle_type || "").toLowerCase();
  const vehicle_type: VehicleCategory = vehicle_type_raw === "suv" ? "suv" : "sedan";
  const referred_by_phone = b.referred_by_phone ? normalizePhone(String(b.referred_by_phone)) : null;
  const preferred_date_raw = b.preferred_date != null ? String(b.preferred_date).trim() : "";
  const preferred_time_raw = b.preferred_time != null ? String(b.preferred_time).trim().toLowerCase() : "";

  const streetAddress = String(b.address || "").trim();
  const city = String(b.city || "").trim();
  const state = String(b.state || "").trim().toUpperCase().slice(0, 2);
  const zip = String(b.zip || "").trim();
  const vehicle_condition_raw = String(b.vehicle_condition || "").toLowerCase();

  const addonRaw = b.addon_ids;
  const addon_ids: string[] = [];
  if (Array.isArray(addonRaw)) {
    for (const x of addonRaw) {
      if (typeof x === "string" && isAddonId(x)) addon_ids.push(x);
    }
  }

  if (name.length < 2) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (phone.length < 10) return NextResponse.json({ error: "A valid mobile number is required so we can text you to confirm." }, { status: 400 });
  if (emailOpt != null && !isStrictEmail(emailOpt)) {
    return NextResponse.json({ error: "If you enter an email, it must be a valid address." }, { status: 400 });
  }

  if (
    streetAddress.length < 4 ||
    city.length < 2 ||
    state.length < 2 ||
    zip.replace(/\D/g, "").length < 5
  ) {
    return NextResponse.json({ error: "Please enter a complete service address." }, { status: 400 });
  }

  if (!["light", "moderate", "heavy"].includes(vehicle_condition_raw)) {
    return NextResponse.json({ error: "Vehicle condition is required." }, { status: 400 });
  }

  if (car_make_model.length < 2) return NextResponse.json({ error: "Vehicle is required." }, { status: 400 });
  if (!isCurrentPackageId(service_package)) {
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

  const pkg = service_package as PackageId;
  const estimatedPrice = bookingEstimateTotal({
    packageId: pkg,
    vehicle: vehicle_type,
    addonIds: addon_ids,
    vehicleCondition: vehicle_condition_raw
  });
  const estimateLines = buildEstimateLines(pkg, vehicle_type, addon_ids, vehicle_condition_raw);

  const zipDigits = zip.replace(/\D/g, "").slice(0, 5);
  const service_address = [streetAddress, `${city}, ${state} ${zipDigits}`].filter(Boolean).join(" · ");

  const booking_addons = {
    addon_ids,
    vehicle_condition: vehicle_condition_raw
  };

  const row = {
    name,
    phone,
    email: emailOpt,
    car_make_model,
    service_package,
    vehicle_type,
    preferred_date: preferred_date_raw,
    preferred_time: preferred_time_raw,
    referred_by_phone: referred_by_phone && referred_by_phone.length >= 10 ? referred_by_phone : null,
    created_at: new Date().toISOString(),
    booking_addons,
    service_address,
    estimated_price: estimatedPrice,
    price: estimatedPrice
  };

  const { error } = await supabase.from("jobs").insert(row);

  if (error) {
    console.error("[jobs] insert error", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Could not save booking. If this persists, ensure Supabase migrations are applied (optional email, booking_addons, service_address)."
      },
      { status: 500 }
    );
  }

  const customerMailOk = await sendCustomerQuoteReceipt({
    customerName: name,
    customerEmail: emailOpt,
    phone,
    carMakeModel: car_make_model,
    vehicleType: vehicle_type,
    servicePackage: pkg,
    preferredDate: preferred_date_raw,
    preferredTime: preferred_time_raw as "morning" | "afternoon" | "evening",
    estimatedPrice,
    estimateLines
  });
  if (!customerMailOk && emailOpt) {
    console.warn("[jobs] quote saved but customer receipt email failed");
  }

  const adminRecipients = await resolveAdminRecipients();
  const adminAlertOk = await sendAdminQuoteAlert({
    recipients: adminRecipients,
    subject: `New Quote • ${name} • ${service_package.toUpperCase()}`,
    text: adminNewQuoteText({
      customerName: name,
      customerEmail: emailOpt,
      phone,
      carMakeModel: car_make_model,
      vehicleType: vehicle_type,
      servicePackage: service_package,
      preferredDate: preferred_date_raw,
      preferredTime: preferred_time_raw,
      estimatedPrice,
      estimateLines
    })
  });
  if (!adminAlertOk) {
    console.warn("[jobs] quote saved but admin alert email failed");
  }
  return NextResponse.json({ ok: true });
}
