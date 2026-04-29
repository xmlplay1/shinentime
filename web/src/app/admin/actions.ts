"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, expectedAdminToken, getAdminPassword } from "@/lib/admin-auth";

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

  const { createAdminClient } = await import("@/lib/supabase/admin");
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
  const expectedPassword = getAdminPassword();
  if (!expectedPassword) {
    redirect("/admin");
  }

  const jar = await cookies();
  const session = jar.get(ADMIN_COOKIE_NAME)?.value;
  if (!session || session !== expectedAdminToken()) {
    redirect("/admin?error=invalid");
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  if (!supabase) redirect("/admin?error=db");

  const payload = {
    name: "Test Customer",
    phone: "7340000000",
    service_package: "gold",
    status: "Pending",
    price: 99
  };

  const { error } = await supabase.from("jobs").insert(payload);
  if (error) {
    console.error("[admin] create test job error", error);
    redirect("/admin?error=create");
  }
  redirect("/admin");
}
