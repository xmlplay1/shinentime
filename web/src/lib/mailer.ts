import nodemailer from "nodemailer";

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;

export function createMailerTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: { user, pass }
  });
}

export function getMailerFrom(): string | null {
  return process.env.GMAIL_USER || null;
}

export function getMailFrom(): string | null {
  return getMailerFrom();
}

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(payload: MailPayload): Promise<boolean> {
  const transport = createMailerTransport();
  const from = getMailerFrom();
  if (!transport || !from) {
    console.error("[mail] Gmail SMTP is not configured. Missing GMAIL_USER or GMAIL_APP_PASSWORD.");
    return false;
  }
  try {
    const info = await transport.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html
    });
    console.log("[mail] sent", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    return true;
  } catch (error) {
    console.error("[mail] send failed", error);
    return false;
  }
}
