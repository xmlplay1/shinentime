import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCustomerEmail } from "@/lib/email-validation";

type Row = Record<string, unknown>;

export async function createReferralIfApplicable(
  supabase: SupabaseClient,
  params: {
    refereeCustomerId: string;
    refereeJobId: number;
    referredByCode: string | null;
    signupIp: string | null;
    signupFingerprint: string | null;
  }
): Promise<void> {
  const code = String(params.referredByCode || "")
    .trim()
    .toUpperCase();
  if (!code || code.length < 4) return;

  const { data: referrer } = await supabase
    .from("customers")
    .select("id,email,last_signup_ip,last_signup_fingerprint")
    .ilike("referral_code", code)
    .maybeSingle();

  if (!referrer?.id) return;
  if (referrer.id === params.refereeCustomerId) return;

  const { data: referee } = await supabase.from("customers").select("email").eq("id", params.refereeCustomerId).maybeSingle();
  if (referee?.email && normalizeCustomerEmail(String(referee.email)) === normalizeCustomerEmail(String(referrer.email))) {
    return;
  }

  let status: "pending" | "flagged" = "pending";
  let abuseReason: string | null = null;
  const refIp = String(referrer.last_signup_ip || "");
  const refFp = String(referrer.last_signup_fingerprint || "");

  if (params.signupIp && refIp && params.signupIp === refIp) {
    status = "flagged";
    abuseReason = "Referee signup IP matches referrer IP";
  } else if (params.signupFingerprint && refFp && params.signupFingerprint === refFp) {
    status = "flagged";
    abuseReason = "Referee signup device fingerprint matches referrer";
  }

  await supabase.from("referrals").upsert(
    {
      referrer_customer_id: referrer.id,
      referee_customer_id: params.refereeCustomerId,
      referee_first_job_id: params.refereeJobId,
      referrer_code_used: code,
      status,
      referrer_snapshot_ip: refIp || null,
      referee_signup_ip: params.signupIp,
      referee_signup_fingerprint: params.signupFingerprint,
      abuse_reason: abuseReason
    },
    { onConflict: "referee_customer_id" }
  );
}

export async function validateReferralsWhenJobCompleted(supabase: SupabaseClient, jobId: number, customerId: string | null) {
  if (!customerId) return;

  const { data: pending } = await supabase
    .from("referrals")
    .select("id,status,referrer_customer_id")
    .eq("referee_customer_id", customerId)
    .maybeSingle();

  const row = pending as (Row & { referrer_customer_id?: string; status?: string }) | null | undefined;
  if (!row?.id) return;
  const st = String(row.status || "");
  if (st !== "pending") return;
  if (row.referrer_customer_id === customerId) return;

  await supabase
    .from("referrals")
    .update({
      status: "validated",
      referee_first_job_id: jobId,
      validated_at: new Date().toISOString()
    })
    .eq("id", row.id);
}
