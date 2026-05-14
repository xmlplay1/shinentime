import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCustomerEmail } from "@/lib/email-validation";
import { normalizePhone } from "@/lib/phone";
import { REFERRAL_PROGRAM_ENABLED } from "@/lib/referral-flags";

type Row = Record<string, unknown>;

/** Referee sees this off the quoted total at booking (applied immediately on the job row). */
export const REFERRAL_REFEREE_DISCOUNT_USD = 10;
/** Referrer receives this account credit when the referee's job is marked Completed (once per referral). */
export const REFERRAL_REFERRER_CREDIT_USD = 10;

export async function evaluateReferralCodeForNewBooking(
  supabase: SupabaseClient,
  input: { codeRaw: string; refereePhone: string; refereeEmail: string | null }
): Promise<{ discountUsd: number; codeStored: string | null }> {
  if (!REFERRAL_PROGRAM_ENABLED) return { discountUsd: 0, codeStored: null };

  const code = String(input.codeRaw || "")
    .trim()
    .toUpperCase();
  if (code.length < 4) return { discountUsd: 0, codeStored: null };

  const { data: referrer } = await supabase
    .from("customers")
    .select("id,email,phone")
    .ilike("referral_code", code)
    .maybeSingle();

  if (!referrer?.id) return { discountUsd: 0, codeStored: null };

  const refPhone = normalizePhone(String(referrer.phone || ""));
  if (refPhone && refPhone === input.refereePhone) return { discountUsd: 0, codeStored: null };

  const refEm = referrer.email ? normalizeCustomerEmail(String(referrer.email)) : "";
  const refereeEm = input.refereeEmail ? normalizeCustomerEmail(input.refereeEmail) : "";
  if (refereeEm && refEm && refereeEm === refEm) return { discountUsd: 0, codeStored: null };

  return { discountUsd: REFERRAL_REFEREE_DISCOUNT_USD, codeStored: code };
}

export async function createReferralIfApplicable(
  supabase: SupabaseClient,
  params: {
    refereeCustomerId: string;
    refereeJobId: number;
    referredByCode: string | null;
    signupIp: string | null;
    signupFingerprint: string | null;
    refereePhone: string;
    refereeDiscountUsd: number;
  }
): Promise<void> {
  if (!REFERRAL_PROGRAM_ENABLED) return;

  const code = String(params.referredByCode || "")
    .trim()
    .toUpperCase();
  if (!code || code.length < 4) return;

  const { data: referrer } = await supabase
    .from("customers")
    .select("id,email,phone,last_signup_ip,last_signup_fingerprint")
    .ilike("referral_code", code)
    .maybeSingle();

  if (!referrer?.id) return;
  if (referrer.id === params.refereeCustomerId) return;

  const { data: referee } = await supabase.from("customers").select("email,phone").eq("id", params.refereeCustomerId).maybeSingle();
  if (referee?.email && normalizeCustomerEmail(String(referee.email)) === normalizeCustomerEmail(String(referrer.email))) {
    return;
  }
  if (normalizePhone(String(referrer.phone || "")) === normalizePhone(params.refereePhone)) {
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
      abuse_reason: abuseReason,
      referee_discount_usd: params.refereeDiscountUsd > 0 ? params.refereeDiscountUsd : REFERRAL_REFEREE_DISCOUNT_USD,
      referrer_credit_usd: 0,
      rewards_settled_at: null
    },
    { onConflict: "referee_customer_id" }
  );
}

/** When a job is marked Completed: credit referrer once (pending referrals only; skips flagged). */
export async function settleReferralRewardsOnJobCompleted(supabase: SupabaseClient, jobId: number): Promise<void> {
  if (!REFERRAL_PROGRAM_ENABLED) return;

  const { data: job } = await supabase
    .from("jobs")
    .select("id,customer_id,status,referred_by_code,referral_discount_amount")
    .eq("id", jobId)
    .maybeSingle();

  if (!job?.customer_id) return;
  if (String(job.status || "").toLowerCase() !== "completed") return;

  const { data: ref } = await supabase
    .from("referrals")
    .select("id,status,referrer_customer_id,rewards_settled_at")
    .eq("referee_customer_id", job.customer_id)
    .maybeSingle();

  const row = ref as (Row & {
    id?: string;
    status?: string;
    referrer_customer_id?: string;
    rewards_settled_at?: string | null;
  }) | null;

  if (!row?.id || row.rewards_settled_at) return;
  if (row.status === "flagged") return;

  const { data: referrer } = await supabase.from("customers").select("id,credit_balance").eq("id", row.referrer_customer_id).maybeSingle();
  if (!referrer?.id) return;

  const credit = REFERRAL_REFERRER_CREDIT_USD;
  const prev = Number((referrer as { credit_balance?: number }).credit_balance) || 0;

  await supabase.from("customers").update({ credit_balance: prev + credit }).eq("id", referrer.id);

  const discount =
    typeof job.referral_discount_amount === "number" && job.referral_discount_amount > 0
      ? job.referral_discount_amount
      : REFERRAL_REFEREE_DISCOUNT_USD;

  await supabase
    .from("referrals")
    .update({
      status: "validated",
      referrer_credit_usd: credit,
      referee_discount_usd: discount,
      rewards_settled_at: new Date().toISOString(),
      validated_at: new Date().toISOString(),
      referee_first_job_id: jobId
    })
    .eq("id", row.id);
}
