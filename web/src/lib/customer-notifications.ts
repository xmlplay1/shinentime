import { randomBytes } from "crypto";
import { format } from "date-fns";
import { createResendClient, getResendFrom } from "@/lib/resend";
import { sendMail } from "@/lib/mailer";
import { isStrictEmail } from "@/lib/email-validation";
import { businessTimeZone, slotStartHour, utcMillisForZoneWallClock } from "@/lib/tz-wall";

const timeLabel: Record<string, string> = {
  morning: "Morning (8am–12pm)",
  afternoon: "Afternoon (12pm–4pm)",
  evening: "Evening (4pm–8pm)"
};

export function newPortalToken(): string {
  return randomBytes(24).toString("base64url");
}

function normalizeToE164US(digitsRaw: string): string | null {
  const digits = digitsRaw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.startsWith("+")) return `+${digits.replace(/^\+/, "")}`;
  if (digits.length >= 11) return `+${digits}`;
  return null;
}

export function publicSiteBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    "https://shinentime.vercel.app";
  if (raw.startsWith("http")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

export function bookingPortalUrl(token: string | null | undefined): string | null {
  if (!token) return null;
  return `${publicSiteBase()}/booking/${encodeURIComponent(token)}`;
}

async function deliverCustomerEmail(subject: string, html: string, text: string, to: string): Promise<boolean> {
  if (!isStrictEmail(to)) return false;

  try {
    const resend = createResendClient();
    if (resend) {
      const { error } = await resend.emails.send({
        from: getResendFrom(),
        to: [to],
        subject,
        html,
        text
      });
      if (!error) return true;
      console.error("[customer-notify] resend failed", error);
    }
  } catch (e) {
    console.error("[customer-notify] resend exception", e);
  }

  return sendMail({ to, subject, text, html });
}

async function sendTwilioSms(toInput: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  const digits = String(toInput || "").replace(/\D/g, "");
  const to = normalizeToE164US(digits);
  if (!sid || !token || !from || !to || !/^\+[1-9]\d{8,14}$/.test(to)) {
    return false;
  }
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ From: from, To: to, Body: body })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[customer-notify] twilio HTTP", res.status, errText.slice(0, 200));
    }
    return res.ok;
  } catch (e) {
    console.error("[customer-notify] twilio exception", e);
    return false;
  }
}

type JobMessagingRow = {
  name: string | null;
  email: string | null;
  phone: string | null;
  car_make_model: string | null;
  service_package: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  customer_portal_token?: string | null;
};

export function summarizePreferred(row: Pick<JobMessagingRow, "preferred_date" | "preferred_time">): string {
  const d = String(row.preferred_date || "").trim();
  const win = String(row.preferred_time || "").toLowerCase();
  if (!d) return "Date TBD";
  let datePretty = d;
  try {
    datePretty = format(new Date(`${d}T12:00:00`), "PPP");
  } catch {
    /* noop */
  }
  const wl = timeLabel[win] || win || "";
  return wl ? `${datePretty} · ${wl}` : datePretty;
}

export async function sendCustomerBookingUpdateEmails(input: {
  kind: "rescheduled" | "cancelled" | "confirmed" | "reminder_24h" | "reminder_2h";
  row: JobMessagingRow;
  previousPreferred?: string;
}): Promise<{ emailOk: boolean; smsOk: boolean }> {
  const name = String(input.row.name || "there").trim() || "there";
  const email = String(input.row.email || "").trim().toLowerCase();
  const portal = bookingPortalUrl(input.row.customer_portal_token || null);

  let subject = "";
  let headline = "";
  let detail = "";

  const whenNow = summarizePreferred(input.row);

  switch (input.kind) {
    case "rescheduled":
      subject = "Shine N Time — Your appointment was rescheduled";
      headline = "We updated your booking time";
      detail = input.previousPreferred
        ? `<p style="margin:0 0 12px;color:#cbd5e1;">Previous: ${input.previousPreferred}</p><p style="margin:0 0 12px;color:#cbd5e1;">New preference: ${whenNow}</p>`
        : `<p style="margin:0 0 12px;color:#cbd5e1;">Your preferred appointment is now: ${whenNow}</p>`;
      break;
    case "cancelled":
      subject = "Shine N Time — Booking cancelled";
      headline = "Your booking has been cancelled";
      detail =
        `<p style="margin:0 0 12px;color:#cbd5e1;">We cancelled the appointment we had on file (${whenNow}). ` +
        `If this was unexpected, reply to this email or call us and we'll sort it out.</p>`;
      break;
    case "confirmed":
      subject = `Shine N Time — Appointment confirmed (${whenNow})`;
      headline = "You are on the calendar";
      detail = `<p style="margin:0 0 12px;color:#cbd5e1;">Confirmed window: ${whenNow}. We'll see you ${input.row.car_make_model ? `with your ${input.row.car_make_model}` : ""}.</p>`;
      break;
    case "reminder_24h":
      subject = "Reminder: Shine N Time visit tomorrow";
      headline = "Your detail is scheduled for tomorrow";
      detail = `<p style="margin:0 0 12px;color:#cbd5e1;">Window: ${whenNow}. Have driveway access and water within ~50ft ready.</p>`;
      break;
    case "reminder_2h":
      subject = "Shine N Time — Arriving soon";
      headline = "Heads up: your appointment window starts soon";
      detail = `<p style="margin:0 0 12px;color:#cbd5e1;">Window: ${whenNow}. Keys ready—we appreciate you!</p>`;
      break;
  }

  const portalBlock = portal
    ? `<p style="margin:16px 0 8px;"><a href="${portal}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">View your booking status</a></p>
       <p style="margin:0;color:#64748b;font-size:12px;">Or open: ${portal}</p>`
    : "";

  const html =
    `<div style="font-family:Inter,Arial,sans-serif;background:#0b0b0b;color:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#111827;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;">
        <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#fbbf24;margin:0 0 10px;">Shine N Time</p>
        <h1 style="margin:0 0 12px;font-size:22px;">${headline}</h1>
        <p style="margin:0 0 12px;color:#cbd5e1;">Hi ${name},</p>
        ${detail}
        ${portalBlock}
        <p style="margin-top:18px;color:#94a3b8;font-size:13px;">Questions? Reply to this email. We are here to help.</p>
      </div>
    </div>`;

  const textLines = [`Hi ${name},`, "", headline.replace(/&#39;/g, "'"), ""];
  if (input.kind === "rescheduled" && input.previousPreferred) {
    textLines.push(`Previous: ${input.previousPreferred}`);
    textLines.push(`New: ${whenNow}`);
  } else if (input.kind === "cancelled") {
    textLines.push(`We cancelled your booking (${whenNow}).`);
  } else if (input.kind === "confirmed") {
    textLines.push(`Confirmed: ${whenNow}`);
  } else {
    textLines.push(`Window: ${whenNow}`);
  }
  if (portal) textLines.push("", `View status: ${portal}`);
  textLines.push("", "— Shine N Time");
  const text = textLines.join("\n");

  const emailOk =
    email && isStrictEmail(email) ? await deliverCustomerEmail(subject, html, text, email) : false;

  const digits = String(input.row.phone || "").replace(/\D/g, "");
  const smsBody =
    input.kind === "reminder_24h"
      ? `Shine N Time: Tomorrow — ${whenNow}. Reply if you need to reschedule.`
      : input.kind === "reminder_2h"
        ? `Shine N Time: Your window starts soon (${whenNow}). Keys & driveway access ready!`
        : input.kind === "cancelled"
          ? `Shine N Time: Your booking (${whenNow}) was cancelled. Call us if this was unexpected.`
          : input.kind === "rescheduled"
            ? `Shine N Time: Your booking moved to ${whenNow}.${portal ? ` Details: ${portal}` : ""}`
            : input.kind === "confirmed"
              ? `Shine N Time: Confirmed ${whenNow}.${portal ? ` ${portal}` : ""}`
              : `Shine N Time update: ${whenNow}`;

  const e164 = digits.length >= 10 ? normalizeToE164US(digits) : null;
  const smsOk = e164 ? await sendTwilioSms(e164, smsBody) : false;

  return { emailOk, smsOk };
}

export function reminderWindowAnchorsUtc(row: Pick<JobMessagingRow, "preferred_date" | "preferred_time">): {
  startUtc: Date;
  endUtc: Date;
} | null {
  const d = String(row.preferred_date || "").trim();
  if (!d) return null;
  const tz = businessTimeZone();
  const startH = slotStartHour(row.preferred_time);

  let endH = startH + 4;
  if (endH > 20) endH = 20;
  const startMs = utcMillisForZoneWallClock(d, startH, 0, tz);
  const endMs = utcMillisForZoneWallClock(d, endH, 0, tz);

  const startUtc = new Date(startMs);
  const endUtc = new Date(endMs > startMs ? endMs : startMs + 4 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}
