import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCustomerEmail, isStrictEmail } from "@/lib/email-validation";
import { normalizePhone } from "@/lib/phone";
import { suggestReferralCodeFromName } from "@/lib/referral-code";

/** Stable synthetic identity when booking is SMS-only (customers.email must remain unique). */
export function bookingCustomerEmail(phone: string, emailOpt: string | null | undefined): string {
  const raw = emailOpt?.trim();
  if (raw && isStrictEmail(normalizeCustomerEmail(raw))) return normalizeCustomerEmail(raw);
  const d = normalizePhone(phone);
  return `cust_${d}@referrals.shinentime.invalid`;
}

export type UpsertCustomerInput = {
  fullName: string;
  phone: string | null;
  signupIp?: string | null;
  signupFingerprint?: string | null;
};

export async function upsertBookingCustomer(
  supabase: SupabaseClient,
  params: UpsertCustomerInput & { emailOpt: string | null }
): Promise<{ id: string; email: string; referral_code: string } | null> {
  const phone = params.phone?.replace(/\s/g, "") || "";
  const email = bookingCustomerEmail(phone, params.emailOpt);
  return upsertCustomerRecord(supabase, email, {
    fullName: params.fullName,
    phone,
    signupIp: params.signupIp ?? null,
    signupFingerprint: params.signupFingerprint ?? null
  });
}

export async function upsertCustomerRecord(
  supabase: SupabaseClient,
  emailRaw: string,
  input: UpsertCustomerInput
): Promise<{ id: string; email: string; referral_code: string } | null> {
  const email = normalizeCustomerEmail(emailRaw);
  if (!isStrictEmail(email)) return null;

  const phone = input.phone?.replace(/\s/g, "") || null;

  const { data: existing } = await supabase
    .from("customers")
    .select("id,email,full_name,phone,referral_code")
    .eq("email", email)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("customers")
      .update({
        full_name: input.fullName.trim() || existing.full_name,
        phone: phone || existing.phone,
        last_signup_ip: input.signupIp || null,
        last_signup_fingerprint: input.signupFingerprint || null
      })
      .eq("id", existing.id);
    if (error) {
      console.error("[customers] update error", error);
      return null;
    }
    return { id: existing.id, email, referral_code: String(existing.referral_code || "") };
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = suggestReferralCodeFromName(input.fullName || email.split("@")[0] || "SHINE");
    const { data: inserted, error } = await supabase
      .from("customers")
      .insert({
        email,
        full_name: input.fullName.trim() || null,
        phone,
        referral_code: code,
        last_signup_ip: input.signupIp || null,
        last_signup_fingerprint: input.signupFingerprint || null
      })
      .select("id,email,referral_code")
      .maybeSingle();

    if (!error && inserted?.id) {
      return {
        id: inserted.id,
        email: inserted.email,
        referral_code: String((inserted as { referral_code?: string }).referral_code || code)
      };
    }

    if (error?.code === "23505") continue;
    console.error("[customers] insert error", error);
    return null;
  }
  return null;
}
