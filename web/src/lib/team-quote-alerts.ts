import { createAdminClient } from "@/lib/supabase/admin";

type QuoteAlertPayload = {
  id?: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  car_make_model: string | null;
  service_package: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  status?: string | null;
};

function normalizeEmail(value: string | null | undefined): string | null {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : null;
}

async function sendByResend(to: string[], subject: string, html: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to.length) return false;

  const from = process.env.RESEND_FROM_EMAIL || "Shine N Time <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from, to, subject, html, text })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[alerts] resend failed", { status: res.status, body });
    return false;
  }
  return true;
}

async function sendTeamEmail(subject: string, text: string, html?: string): Promise<boolean> {
  const recipients = await resolveTeamRecipients();
  if (!recipients.length) {
    console.warn("[alerts] no admin/service-rep recipients configured");
    return false;
  }
  return sendByResend(
    recipients,
    subject,
    html || `<pre style="font-family:Inter,Arial,sans-serif;white-space:pre-wrap">${text}</pre>`,
    text
  );
}

async function resolveTeamRecipients(): Promise<string[]> {
  const out = new Set<string>();
  const envRecipients = String(process.env.ADMIN_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((v) => normalizeEmail(v))
    .filter((v): v is string => Boolean(v));
  envRecipients.forEach((v) => out.add(v));

  const supabase = createAdminClient();
  if (!supabase) return [...out];

  const { data } = await supabase
    .from("profiles")
    .select("email, role")
    .in("role", ["ADMIN", "SERVICE_REP"]);

  for (const row of data || []) {
    const normalized = normalizeEmail((row as { email?: string | null }).email || null);
    if (normalized) out.add(normalized);
  }
  return [...out];
}

export async function notifyTeamNewQuote(payload: QuoteAlertPayload): Promise<boolean> {
  const subject = `New Quote • ${payload.name || "Customer"} • ${(payload.service_package || "package").toUpperCase()}`;
  const location = [payload.address, payload.city, payload.state, payload.zip].filter(Boolean).join(", ");
  const lines = [
    `Quote ID: ${payload.id ?? "n/a"}`,
    `Name: ${payload.name || "n/a"}`,
    `Email: ${payload.email || "n/a"}`,
    `Phone: ${payload.phone || "n/a"}`,
    `Vehicle: ${payload.car_make_model || "n/a"}`,
    `Package: ${payload.service_package || "n/a"}`,
    `Preferred: ${payload.preferred_date || "n/a"} ${payload.preferred_time || ""}`.trim(),
    `Address: ${location || "n/a"}`,
    `Status: ${payload.status || "Pending"}`
  ];
  const text = lines.join("\n");
  return sendTeamEmail(subject, text);
}

// Backward-compatible aliases used by API/admin callers.
export const sendNewQuoteTeamAlert = notifyTeamNewQuote;
export const sendTeamQuoteAlertForJob = notifyTeamNewQuote;

export async function resendTeamAlertForJob(jobId: number): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("jobs")
    .select("id,name,phone,email,car_make_model,service_package,preferred_date,preferred_time,address,city,state,zip,status")
    .eq("id", jobId)
    .maybeSingle();
  if (!data) return false;
  return notifyTeamNewQuote(data as QuoteAlertPayload);
}

export async function sendAdminDailyDigest(input: {
  totalNewLeads: number;
  pendingFollowUps: number;
  completedToday: number;
  escalations: { id: number; name: string; ageHours: number }[];
}): Promise<boolean> {
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
  return sendTeamEmail(subject, text);
}

// Backward-compatible alias used by digest route.
export const sendDailyDigestEmail = sendAdminDailyDigest;
