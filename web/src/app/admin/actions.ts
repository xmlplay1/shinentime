"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, expectedAdminToken } from "@/lib/admin-auth";

export async function adminLoginAction(formData: FormData) {
  const submitted = String(formData.get("password") || "");
  const expectedPassword = process.env.ADMIN_PASSWORD;
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
