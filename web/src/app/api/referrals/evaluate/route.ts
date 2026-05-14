import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { normalizeCustomerEmail, isStrictEmail } from "@/lib/email-validation";
import { evaluateReferralCodeForNewBooking } from "@/lib/referral-service";
import { REFERRAL_PROGRAM_ENABLED } from "@/lib/referral-flags";

/** Preview referral discount for the booking UI (same rules as POST /api/jobs). */
export async function GET(req: Request) {
  if (!REFERRAL_PROGRAM_ENABLED) {
    return NextResponse.json({ discountUsd: 0, codeStored: null });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const codeRaw = searchParams.get("code") || "";
  const phone = normalizePhone(searchParams.get("phone") || "");
  const emailParam = searchParams.get("email") || "";
  const emailNorm = normalizeCustomerEmail(emailParam);
  const refereeEmail = emailParam.trim() && isStrictEmail(emailNorm) ? emailNorm : null;

  if (phone.length < 10) {
    return NextResponse.json({ discountUsd: 0, codeStored: null });
  }

  const result = await evaluateReferralCodeForNewBooking(supabase, {
    codeRaw,
    refereePhone: phone,
    refereeEmail
  });

  return NextResponse.json(result);
}
