import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "snt_admin_session";
const ADMIN_PASSWORD_FALLBACK = "shinentime2009";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || ADMIN_PASSWORD_FALLBACK;
}

function toToken(value: string | undefined): string {
  return Buffer.from(`snt-admin:${value ?? ""}`).toString("base64url");
}

export function expectedAdminToken(): string {
  return toToken(getAdminPassword());
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const cookie = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return false;
  return cookie === expectedAdminToken();
}
