import { createAdminClient } from "@/lib/supabase/admin";
import { createResendClient, getResendFrom } from "@/lib/resend";
import { sendMail } from "@/lib/mailer";

type QuoteAlertPayload = {
  id?: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  car_make_model: string | null;
  service_package: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status?: string | null;
};

function normalizeEmail(value: string | null | undefined): string | null {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : null;
}

async function resolveTeamRecipients(): Promise<string[]> {
  const out = new Set<string>();
  String(process.env.ADMIN_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((v) => normalizeEmail(v))
    .filter((v): v is string => Boolean(v))
    .forEach((v) => out.add(v));

  const supabase = createAdminClient();
  if (supabase) {
    const { data } = await supabase.from("profiles").select("email, role").in("role", ["ADMIN", "SERVICE_REP"]);
    for (const row of data || []) {
      const email = normalizeEmail((row as { email?: string | null }).email || null);
      if (email) out.add(email);
    }
  }
  return [...out];
}

async function deliverTeamEmail(recipients: string[], subject: string, text: string): Promise<boolean> {
  if (!recipients.length) return false;
  try {
    const resend = createResendClient();
    if (resend) {
      const { error } = await resend.emails.send({
        from: getResendFrom(),
        to: recipients,
        subject,
        text,
        html: `<pre style="font-family:Inter,Arial,sans-serif;white-space:pre-wrap">${text}</pre>`
      });
      if (!error) return true;
      console.error("[alerts] resend send failed", error);
    }
  } catch (error) {
    console.error("[alerts] resend send exception", error);
  }

  let delivered = false;
  for (const to of recipients) {
    const ok = await sendMail({ to, subject, text });
    delivered = delivered || ok;
  }
  return delivered;
}

function toPayload(input: Record<string, unknown>): QuoteAlertPayload {
  return {
    id: typeof input.id === "number" ? input.id : undefined,
    name: typeof input.name === "string" ? input.name : null,
    phone: typeof input.phone === "string" ? input.phone : null,
    email: typeof input.email === "string" ? input.email : null,
    car_make_model: typeof input.car_make_model === "string" ? input.car_make_model : null,
    service_package: typeof input.service_package === "string" ? input.service_package : null,
    preferred_date: typeof input.preferred_date === "string" ? input.preferred_date : null,
    preferred_time: typeof input.preferred_time === "string" ? input.preferred_time : null,
    status: typeof input.status === "string" ? input.status : null
  };
}

export async function notifyTeamNewQuote(payload: QuoteAlertPayload, subjectPrefix?: string): Promise<boolean> {
  const recipients = await resolveTeamRecipients();
  const subject = subjectPrefix
    ? `${subjectPrefix} • ${payload.name || "Customer"} • ${(payload.service_package || "package").toUpperCase()}`
    : `New Quote • ${payload.name || "Customer"} • ${(payload.service_package || "package").toUpperCase()}`;
  const text = [
    `Quote ID: ${payload.id ?? "n/a"}`,
    `Name: ${payload.name || "n/a"}`,
    `Email: ${payload.email || "n/a"}`,
    `Phone: ${payload.phone || "n/a"}`,
    `Vehicle: ${payload.car_make_model || "n/a"}`,
    `Package: ${payload.service_package || "n/a"}`,
    `Preferred: ${payload.preferred_date || "n/a"} ${payload.preferred_time || ""}`.trim(),
    `Status: ${payload.status || "Pending"}`
  ].join("\n");
  return deliverTeamEmail(recipients, subject, text);
}

export async function sendTeamQuoteAlertForJob(
  input: number | Record<string, unknown>,
  subjectPrefix?: string
): Promise<boolean> {
  if (typeof input === "number") {
    const supabase = createAdminClient();
    if (!supabase) return false;
    const { data } = await supabase
      .from("jobs")
      .select("id,name,email,phone,car_make_model,service_package,preferred_date,preferred_time,status")
      .eq("id", input)
      .maybeSingle();
    if (!data) return false;
    return notifyTeamNewQuote(data as QuoteAlertPayload, subjectPrefix);
  }
  return notifyTeamNewQuote(toPayload(input), subjectPrefix);
}

export function followUpTemplateFor(
  status: string,
  customerName: string,
  packageName: string,
  channel: "email" | "sms"
): string {
  const s = String(status || "").toLowerCase();
  const name = customerName || "there";
  const pkg = packageName || "your detail package";

  if (channel === "sms") {
    if (s === "pending") {
      return `Hi ${name}, quick follow-up from Shine N Time about your ${pkg} quote. Want morning, afternoon, or evening this week?`;
    }
    if (s === "confirmed") {
      return `Hi ${name}, you're confirmed for ${pkg}. Reply here if you need to reschedule.`;
    }
    return `Hi ${name}, thanks for choosing Shine N Time for ${pkg}. We'd love your feedback when you have a minute.`;
  }

  if (s === "pending") {
    return `Hi ${name},\n\nJust checking in on your ${pkg} quote with Shine N Time. We can lock in a time that works for you.\n\nReply with your preferred day/time and we’ll handle the rest.`;
  }
  if (s === "confirmed") {
    return `Hi ${name},\n\nYour ${pkg} appointment is confirmed with Shine N Time.\n\nIf anything changes, reply to this email and we can reschedule quickly.`;
  }
  return `Hi ${name},\n\nThanks again for trusting Shine N Time for your ${pkg} service.\n\nIf you have a minute, we'd really appreciate a quick review.`;
}

export async function sendAdminDailyDigest(input: {
  totalNewLeads: number;
  pendingFollowUps: number;
  completedToday: number;
  escalations: { id: number; name: string; ageHours: number }[];
}): Promise<boolean> {
  const recipients = await resolveTeamRecipients();
  const subject = `Daily Digest • Leads ${input.totalNewLeads} • Pending ${input.pendingFollowUps} • Completed ${input.completedToday}`;
  const escalationLines = input.escalations.length
    ? input.escalations.map((e) => `- #${e.id} ${e.name} (${e.ageHours}h old)`).join("\n")
    : "- none";
  const text = [
    "Shine N Time Daily Digest",
    "",
    `New leads (24h): ${input.totalNewLeads}`,
    `Pending follow-ups: ${input.pendingFollowUps}`,
    `Completed today: ${input.completedToday}`,
    "",
    "Escalations:",
    escalationLines
  ].join("\n");
  return deliverTeamEmail(recipients, subject, text);
}

export const sendDailyDigestEmail = sendAdminDailyDigest;

