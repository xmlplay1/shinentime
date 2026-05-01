"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, expectedAdminToken, getAdminPassword } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { sendTeamQuoteAlertForJob } from "@/lib/team-quote-alerts";
import { followUpTemplateFor } from "@/lib/admin-insights";
import { sendMail } from "@/lib/mailer";
import { isStrictEmail, normalizeCustomerEmail } from "@/lib/email-validation";
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

  const allowed = new Set(["Pending", "Confirmed", "Completed", "Archived"]);
  if (!allowed.has(nextStatus)) redirect("/admin");

  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const { error } = await supabase.from("jobs").update({ status: nextStatus }).eq("id", id);
  if (error) {
    console.error("[admin] update status error", error);
    redirect("/admin?error=update");
  }
  redirect("/admin");
}

export async function createTestJobAction() {
  await requireAdminCookie();

  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const payload = {
    name: "Test Customer",
    phone: "7340000000",
    service_package: "gold",
    car_make_model: "Honda CR-V",
    preferred_date: new Date().toISOString().slice(0, 10),
    preferred_time: "afternoon",
    status: "Pending",
    vehicle_type: "suv",
    price: 99,
    email: "test@example.com"
  };

  const { error } = await supabase.from("jobs").insert(payload);
  if (error) {
    console.error("[admin] create test job error", error);
    redirect("/admin?error=create");
  }
  redirect("/admin");
}

export async function createJobAdminAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const name = String(formData.get("name") || "").trim();
  const email = normalizeCustomerEmail(String(formData.get("email") || ""));
  const emailConfirm = normalizeCustomerEmail(String(formData.get("email_confirm") || ""));
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const carMakeModel = String(formData.get("car_make_model") || "").trim();
  const servicePackage = String(formData.get("service_package") || "").toLowerCase();
  const vehicleTypeRaw = String(formData.get("vehicle_type") || "").toLowerCase();
  const preferredDate = String(formData.get("preferred_date") || "").trim();
  const preferredTime = String(formData.get("preferred_time") || "").toLowerCase();

  if (name.length < 2) redirect("/admin?error=create-name");
  if (!isStrictEmail(email) || email !== emailConfirm) redirect("/admin?error=create-email");
  if (carMakeModel.length < 2) redirect("/admin?error=create-car");
  if (!["silver", "gold", "platinum"].includes(servicePackage)) redirect("/admin?error=create-package");
  if (!["sedan", "suv"].includes(vehicleTypeRaw)) redirect("/admin?error=create-vehicle");
  if (!["morning", "afternoon", "evening"].includes(preferredTime)) redirect("/admin?error=create-time");
  if (!preferredDate) redirect("/admin?error=create-date");

  const vehicleType = (vehicleTypeRaw === "suv" ? "suv" : "sedan") as VehicleCategory;
  const pkg = servicePackage as PackageId;
  const estimated = priceFor(pkg, vehicleType);

  const { error } = await supabase.from("jobs").insert({
    name,
    email,
    phone: phone.length >= 10 ? phone : null,
    car_make_model: carMakeModel,
    service_package: servicePackage,
    vehicle_type: vehicleType,
    preferred_date: preferredDate,
    preferred_time: preferredTime,
    status: "Pending",
    price: estimated,
    estimated_price: estimated
  });
  if (error) {
    console.error("[admin] create job error", error);
    redirect("/admin?error=create-job");
  }
  redirect("/admin?created=1");
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
export async function resendQuoteAlertAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isFinite(id)) redirect("/admin");

  const { data: job } = await supabase
    .from("jobs")
    .select("id,name,email,phone,car_make_model,service_package,preferred_date,preferred_time,status")
    .eq("id", id)
    .maybeSingle();
  if (!job) redirect("/admin?error=job-not-found");

  const sent = await sendTeamQuoteAlertForJob(job as Record<string, unknown>);
  if (!sent) {
    redirect("/admin?error=alert-failed");
  }
  redirect("/admin?alert=resent");
}

// Backward-compatible alias used by admin page imports.
export async function sendQuoteAlertAction(formData: FormData) {
  return resendQuoteAlertAction(formData);
}

export async function escalateNoResponseAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isFinite(id)) redirect("/admin");

  const { data: job } = await supabase
    .from("jobs")
    .select("id,name,email,phone,car_make_model,service_package,preferred_date,preferred_time,status,created_at")
    .eq("id", id)
    .maybeSingle();
  if (!job) redirect("/admin?error=job-not-found");

  const sent = await sendTeamQuoteAlertForJob(job as Record<string, unknown>, "No response escalation");
  if (!sent) redirect("/admin?error=escalation-alert-failed");

  await supabase.from("job_communication_logs").insert({
    job_id: id,
    channel: "internal",
    note: "Escalation alert sent (no response SLA breached).",
    created_by: "system"
  });
  redirect("/admin?escalation=sent");
}

export async function addFollowUpTemplateLogAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const jobId = Number.parseInt(String(formData.get("job_id") || ""), 10);
  const status = String(formData.get("status") || "pending");
  const channel = String(formData.get("channel") || "email").toLowerCase();
  const customer = String(formData.get("customer") || "Customer");
  const pkg = String(formData.get("package") || "detail package");
  if (!Number.isFinite(jobId)) redirect("/admin");
  if (!(channel === "email" || channel === "sms")) redirect("/admin");

  const template = followUpTemplateFor(status, customer, pkg, channel as "email" | "sms");
  const { error } = await supabase.from("job_communication_logs").insert({
    job_id: jobId,
    channel: channel === "email" ? "email" : "sms",
    note: `Template used (${channel}): ${template}`,
    created_by: "template"
  });
  if (error) {
    console.error("[admin] template log error", error);
    redirect("/admin?error=template-log");
  }
  redirect("/admin?template=logged");
}

export async function deleteJobAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isFinite(id)) redirect("/admin");

  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) {
    console.error("[admin] delete job error", error);
    redirect("/admin?error=delete");
  }
  redirect("/admin?deleted=1");
}

export async function archiveJobAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isFinite(id)) redirect("/admin");

  const { error } = await supabase.from("jobs").update({ status: "Archived" }).eq("id", id);
  if (error) {
    console.error("[admin] archive job error", error);
    redirect("/admin?error=archive");
  }
  redirect("/admin?archived=1");
}

export async function restoreArchivedJobAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const id = Number.parseInt(String(formData.get("id") || ""), 10);
  if (!Number.isFinite(id)) redirect("/admin");

  const { error } = await supabase.from("jobs").update({ status: "Pending" }).eq("id", id);
  if (error) {
    console.error("[admin] restore archived job error", error);
    redirect("/admin?error=restore");
  }
  redirect("/admin?restored=1");
}

export async function clearPipelineAction(formData: FormData) {
  await requireAdminCookie();
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const mode = String(formData.get("mode") || "completed");
  if (mode === "all") {
    const { error } = await supabase.from("jobs").delete().gt("id", 0);
    if (error) {
      console.error("[admin] clear all jobs error", error);
      redirect("/admin?error=clear-all");
    }
    redirect("/admin?cleared=all");
  }

  const { error } = await supabase.from("jobs").delete().eq("status", "Completed");
  if (error) {
    console.error("[admin] clear completed jobs error", error);
    redirect("/admin?error=clear-completed");
  }
  redirect("/admin?cleared=completed");
}

export async function sendTestAdminEmailAction() {
  await requireAdminCookie();
  const to = String(process.env.ADMIN_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.includes("@"));

  if (!to.length) {
    redirect("/admin?error=no-admin-email");
  }

  const sent = await Promise.all(
    to.map((email) =>
      sendMail({
        to: email,
        subject: "Shine N Time Admin Email Test",
        text: "Test successful: admin notification path is working from /admin."
      })
    )
  );
  if (!sent.some(Boolean)) {
    redirect("/admin?error=test-email-failed");
  }
  redirect("/admin?test-email=sent");
}
