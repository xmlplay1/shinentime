"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, expectedAdminToken, getAdminPassword } from "@/lib/admin-auth";
import { priceFor } from "@/lib/package-pricing";
import { reviewRequestHtml, reviewRequestText } from "@/lib/email-templates";
import { createResendClient, getResendFrom } from "@/lib/resend";

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
  const expectedPassword = getAdminPassword();
  if (!expectedPassword) {
    redirect("/admin");
  }

  const jar = await cookies();
  const session = jar.get(ADMIN_COOKIE_NAME)?.value;
  if (!session || session !== expectedAdminToken()) {
    redirect("/admin?error=invalid");
  }

  const idRaw = String(formData.get("id") || "").trim();
  const nextStatus = String(formData.get("status") || "Pending").trim();
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id)) redirect("/admin");

  const allowed = new Set(["Pending", "Confirmed", "Completed"]);
  if (!allowed.has(nextStatus)) redirect("/admin");

  const { createServiceRoleClient } = await import("@/lib/supabase/admin");
  const supabase = createServiceRoleClient();
  if (!supabase) redirect("/admin?error=db");

  const { error } = await supabase.from("jobs").update({ status: nextStatus }).eq("id", id);
  if (error) {
    console.error("[admin] update status error", error);
    redirect("/admin?error=update");
  }
  redirect("/admin");
}

export async function createTestJobAction() {
  const expectedPassword = getAdminPassword();
  if (!expectedPassword) {
    redirect("/admin");
  }

  const jar = await cookies();
  const session = jar.get(ADMIN_COOKIE_NAME)?.value;
  if (!session || session !== expectedAdminToken()) {
    redirect("/admin?error=invalid");
  }

  const { createServiceRoleClient } = await import("@/lib/supabase/admin");
  const supabase = createServiceRoleClient();
  if (!supabase) redirect("/admin?error=db");

  const testPrice = priceFor("gold", "sedan");
  const payload = {
    name: "Test Customer",
    phone: "7345550100",
    car_make_model: "Honda Civic",
    service_package: "gold",
    vehicle_type: "sedan",
    status: "Pending",
    price: testPrice,
    estimated_price: testPrice
  };

  const { error } = await supabase.from("jobs").insert(payload);
  if (error) {
    console.error("[admin] create test job error", error);
    redirect("/admin?error=create");
  }
  redirect("/admin");
}

export async function sendReviewEmailAction(formData: FormData) {
  const expectedPassword = getAdminPassword();
  if (!expectedPassword) {
    redirect("/admin");
  }

  const jar = await cookies();
  const session = jar.get(ADMIN_COOKIE_NAME)?.value;
  if (!session || session !== expectedAdminToken()) {
    redirect("/admin?error=invalid");
  }

  const idRaw = String(formData.get("id") || "").trim();
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id)) redirect("/admin?error=review-id");

  const providedName = String(formData.get("name") || "").trim();
  const providedEmail = String(formData.get("email") || "").trim().toLowerCase();

  const { createServiceRoleClient } = await import("@/lib/supabase/admin");
  const supabase = createServiceRoleClient();
  if (!supabase) redirect("/admin?error=db");

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, name, email, car_make_model, service_package, status")
    .eq("id", id)
    .maybeSingle();
  if (error || !job) {
    console.error("[admin] review email lookup error", error);
    redirect("/admin?error=review-lookup");
  }
  const email = providedEmail || String(job.email || "").trim().toLowerCase();
  const status = String(job.status || "").toLowerCase();
  if (!email) redirect("/admin?error=review-no-email");
  if (status !== "completed") redirect("/admin?error=review-not-completed");

  const reviewLink =
    process.env.SNT_REVIEW_GOOGLE_URL ||
    process.env.SNT_REVIEW_FACEBOOK_URL ||
    process.env.REVIEW_REQUEST_URL ||
    "https://g.page/r/CWfVxB8UuvgHEBM/review";
  const customerName = providedName || String(job.name || "there");

  const resend = createResendClient();
  if (!resend) redirect("/admin?error=resend-not-configured");
  try {
    await resend.emails.send({
      from: getResendFrom(),
      to: email,
      subject: "Thank you from Shine N Time - would you leave us a quick review?",
      html: reviewRequestHtml(customerName, reviewLink),
      text: reviewRequestText(customerName, reviewLink)
    });
  } catch (sendError) {
    console.error("[admin] review email send error", sendError);
    redirect("/admin?error=review-send");
  }

  redirect("/admin?sent=review");
}
