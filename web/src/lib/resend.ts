import { Resend } from "resend";

const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "Shine N Time <onboarding@resend.dev>";

export function createResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export function getResendFrom(): string {
  return RESEND_FROM;
}
