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

