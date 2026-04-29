"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, expectedAdminToken, getAdminPassword } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { normalizeCustomerEmail, isStrictEmail } from "@/lib/email-validation";
import { upsertCustomerRecord } from "@/lib/customers-db";
import { validateReferralsWhenJobCompleted } from "@/lib/referral-service";
import { priceFor, type PackageId, type VehicleCategory } from "@/lib/package-pricing";

function ensureAdminSession() {
  const expectedPassword = getAdminPassword();
  if (!expectedPassword) redirect("/admin");
  return expectedPassword;
}

async function requireAdminCookie() {
  ensureAdminSession();
  const jar = await cookies();
  const session = jar.get(ADMIN_COOKIE_NAME)?.value;
  if (!session || session !== expectedAdminToken()) {
    redirect("/admin?error=invalid");
  }
}

export async function adminLoginAction(formData: FormData) {
  const submitted = String(formData.get("password") || "");
  const expectedPassword = getAdminPassword();
  if (!expectedPassword || submitted !== expectedPassword) {
    redirect("/admin?error=invalid");
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE_NAME, expectedAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  redirect("/admin");
}

export async function adminLogoutAction() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE_NAME);
  redirect("/admin");
}

export async function updateJobStatusAction(formData: FormData) {
  await requireAdminCookie();

  const idRaw = String(formData.get("id") || "").trim();
  const nextStatus = String(formData.get("status") || "Pending").trim();
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id)) redirect("/admin");

  const allowed = new Set(["Pending", "Confirmed", "Completed", "Cancelled"]);
  if (!allowed.has(nextStatus)) redirect("/admin");

  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const { data: existing } = await supabase.from("jobs").select("id,customer_id,email,status").eq("id", id).maybeSingle();
  const custId = typeof existing?.customer_id === "string" ? existing.customer_id : null;
  const emailNorm = existing?.email ? normalizeCustomerEmail(String(existing.email)) : null;

  const { error } = await supabase.from("jobs").update({ status: nextStatus }).eq("id", id);
  if (error) {
    console.error("[admin] update status error", error);
    redirect("/admin?error=update");
  }

  if (nextStatus === "Completed") {
    let resolvedId = custId;
    if (!resolvedId && emailNorm) {
      const { data: cust } = await supabase.from("customers").select("id").eq("email", emailNorm).maybeSingle();
      resolvedId = cust?.id || null;
    }
    if (resolvedId) await validateReferralsWhenJobCompleted(supabase, id, resolvedId);
  }

  redirect("/admin");
}

export async function createJobAdminAction(formData: FormData) {
  await requireAdminCookie();

  const name = String(formData.get("name") || "").trim();
  const email = normalizeCustomerEmail(String(formData.get("email") || ""));
  const emailConfirm = normalizeCustomerEmail(String(formData.get("email_confirm") || ""));
  const phoneRaw = normalizePhone(String(formData.get("phone") || ""));
  const phone = phoneRaw.length >= 10 ? phoneRaw : null;
  const car_make_model = String(formData.get("car_make_model") || "").trim();
  const service_package = String(formData.get("service_package") || "").toLowerCase();
  const vehicle_type = String(formData.get("vehicle_type") || "").toLowerCase();
  const preferred_date = String(formData.get("preferred_date") || "").trim();
  const preferred_time = String(formData.get("preferred_time") || "").trim().toLowerCase();

  if (name.length < 2 || !isStrictEmail(email) || email !== emailConfirm) redirect("/admin?error=create-job-invalid");
  if (car_make_model.length < 2) redirect("/admin?error=create-job-invalid");
  if (!["silver", "gold", "platinum"].includes(service_package) || !["sedan", "suv"].includes(vehicle_type)) redirect("/admin?error=create-job-invalid");

  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const customer = await upsertCustomerRecord(supabase, email, { fullName: name, phone });
  if (!customer) redirect("/admin?error=create-job-customer");

  const price = priceFor(service_package as PackageId, vehicle_type as VehicleCategory);

  const preferredDateObj = new Date(`${preferred_date}T12:00:00`);
  if (!preferred_date || Number.isNaN(preferredDateObj.getTime())) redirect("/admin?error=create-job-invalid");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preferredDateObj < today || preferredDateObj.getDay() === 0) redirect("/admin?error=create-job-invalid");
  if (!["morning", "afternoon", "evening"].includes(preferred_time)) redirect("/admin?error=create-job-invalid");

  const { error } = await supabase.from("jobs").insert({
    name,
    phone,
    email,
    customer_id: customer.id,
    car_make_model,
    service_package,
    vehicle_type,
    estimated_price: price,
    price,
    preferred_date,
    preferred_time,
    status: "Pending",
    created_at: new Date().toISOString()
  });

  if (error) {
    console.error("[admin] create job error", error);
    redirect("/admin?error=create-job");
  }
  redirect("/admin");
}

export async function rescheduleJobAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  const preferredDate = String(formData.get("preferred_date") || "").trim();
  const preferredTime = String(formData.get("preferred_time") || "").trim().toLowerCase();
  if (!Number.isFinite(id) || !preferredDate) redirect("/admin");
  if (!["morning", "afternoon", "evening"].includes(preferredTime)) redirect("/admin");

  const dateObj = new Date(`${preferredDate}T12:00:00`);
  if (Number.isNaN(dateObj.getTime())) redirect("/admin");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj < today || dateObj.getDay() === 0) redirect("/admin");

  const { data: jobRow } = await supabase.from("jobs").select("status").eq("id", id).maybeSingle();
  const prev = String(jobRow?.status || "").toLowerCase();
  const nextBookingStatus = prev === "cancelled" ? "Pending" : "Confirmed";

  const { error } = await supabase
    .from("jobs")
    .update({ preferred_date: preferredDate, preferred_time: preferredTime, status: nextBookingStatus })
    .eq("id", id);

  if (error) {
    console.error("[admin] reschedule job error", error);
    redirect("/admin?error=reschedule");
  }
  redirect("/admin");
}

export async function cancelJobAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isFinite(id)) redirect("/admin");

  const extra = String(formData.get("cancel_note") || "").trim();
  const stamp = `Cancelled · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  let notesPatch: string | null = null;
  if (extra) {
    const { data: row } = await supabase.from("jobs").select("notes").eq("id", id).maybeSingle();
    const prev = row?.notes ? String(row.notes) : "";
    notesPatch = prev ? `${prev}\n${stamp}: ${extra}` : `${stamp}: ${extra}`;
  }

  const { error } = await supabase
    .from("jobs")
    .update({ status: "Cancelled", ...(notesPatch ? { notes: notesPatch } : {}) })
    .eq("id", id);
  if (error) {
    console.error("[admin] cancel job error", error);
    redirect("/admin?error=cancel");
  }
  redirect("/admin");
}

export async function createTestJobAction() {
  await requireAdminCookie();

  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const testEmail = "test@example.com";
  const cust = await upsertCustomerRecord(supabase, testEmail, { fullName: "Test Customer", phone: "7340000000" });
  if (!cust) redirect("/admin?error=create");

  const price = priceFor("gold", "suv");
  const payload = {
    name: "Test Customer",
    phone: "7340000000",
    email: testEmail,
    customer_id: cust.id,
    service_package: "gold",
    car_make_model: "Honda CR-V",
    preferred_date: new Date().toISOString().slice(0, 10),
    preferred_time: "afternoon",
    status: "Pending",
    vehicle_type: "suv",
    estimated_price: price,
    price
  };

  const { error } = await supabase.from("jobs").insert(payload);
  if (error) {
    console.error("[admin] create test job error", error);
    redirect("/admin?error=create");
  }
  redirect("/admin");
}

export async function addCommunicationLogAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const jobId = Number.parseInt(String(formData.get("job_id") || ""), 10);
  const channel = String(formData.get("channel") || "internal").toLowerCase();
  const note = String(formData.get("note") || "").trim();
  const createdBy = String(formData.get("created_by") || "team").trim();
  if (!Number.isFinite(jobId) || !note) redirect("/admin");

  const allowed = new Set(["sms", "call", "email", "internal"]);
  if (!allowed.has(channel)) redirect("/admin");

  const { error } = await supabase.from("job_communication_logs").insert({
    job_id: jobId,
    channel,
    note,
    created_by: createdBy
  });
  if (error) {
    console.error("[admin] log insert error", error);
    redirect("/admin?error=log");
  }
  redirect("/admin");
}

export async function uploadJobImageAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const jobId = Number.parseInt(String(formData.get("job_id") || ""), 10);
  const type = String(formData.get("type") || "before").toLowerCase();
  const file = formData.get("image");
  if (!Number.isFinite(jobId) || !(file instanceof File) || file.size === 0) redirect("/admin");

  const ext = file.name.split(".").pop() || "jpg";
  const safeType = type === "after" ? "after" : "before";
  const path = `job-${jobId}/${safeType}-${Date.now()}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage.from("job-images").upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: true
  });
  if (error) {
    console.error("[admin] image upload error", error);
    redirect("/admin?error=upload");
  }
  redirect("/admin");
}

export async function createTeamMemberAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "SERVICE_REP").trim().toUpperCase();
  const allowedRoles = new Set(["ADMIN", "SERVICE_REP"]);
  if (!email.includes("@") || !allowedRoles.has(role)) redirect("/admin?error=team-input");

  const temporaryPassword = `Snt!${Math.random().toString(36).slice(2, 10)}A1`;
  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, role }
  });
  if (authError || !created.user) {
    console.error("[admin] create user error", authError);
    redirect("/admin?error=team-auth");
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: created.user.id,
    email,
    full_name: fullName || null,
    role
  });
  if (profileError) {
    console.error("[admin] profile upsert error", profileError);
    redirect("/admin?error=team-profile");
  }

  redirect("/admin?team=created");
}

export async function claimJobAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");
  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  const rep = String(formData.get("rep") || "").trim();
  if (!Number.isFinite(id) || !rep) redirect("/admin");

  const { error } = await supabase
    .from("jobs")
    .update({ claimed_by: rep, assigned_rep: rep, phone: normalizePhone(String(formData.get("phone") || "")) || undefined })
    .eq("id", id);

  if (error) {
    console.error("[admin] claim job error", error);
    redirect("/admin?error=claim");
  }
  redirect("/admin");
}

export async function autoLogContactAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const jobId = Number.parseInt(String(formData.get("job_id") || ""), 10);
  const channelRaw = String(formData.get("channel") || "").toLowerCase();
  const customer = String(formData.get("customer") || "customer");
  if (!Number.isFinite(jobId) || !(channelRaw === "sms" || channelRaw === "call")) {
    redirect("/admin");
  }

  const note = channelRaw === "sms" ? `SMS sent to ${customer}` : `Call initiated to ${customer}`;
  const { error } = await supabase.from("job_communication_logs").insert({
    job_id: jobId,
    channel: channelRaw,
    note,
    created_by: "auto"
  });
  if (error) {
    console.error("[admin] auto log error", error);
  }
  redirect("/admin");
}
